/**
 * dsh-input-plus Host half — a static Cordis plugin.
 *
 * Responsibilities (Host-owned, per research/dsh-input-plus-file-reference.md):
 * - expose the `@` candidate index to the browser half over same-origin HTTP
 *   routes (only `relative` + `kind` ever cross the wire);
 * - register per-session settings (master switch, size limits);
 * - inject resolved file contents / directory manifests at `agent/pre-step`,
 *   re-validating every `@` token through the Host safety layer at send time.
 *
 * Every side effect is Fiber-owned (`ctx.effect` / `ctx.on` disposers), so
 * stop/unload removes routes, settings and listeners.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { normalizeRoot, indexWorkspace, resolveReference, searchCandidates } from './host/files.js'
import { scanMentions, uniqueMentions, resolveToBlocks } from './host/mention.js'
import { createWorkspaceResolver } from './host/workspace.js'
import { buildSchema, DEFAULTS, SETTINGS_NAMESPACE, type InputPlusSettings } from './host/settings.js'
import {
  ROUTE_CANDIDATES,
  ROUTE_RESOLVE,
  type CandidatesEnvelope,
  type ResolveEnvelope,
  type RefErrorCode,
} from './contract.js'

// Load the `declare module '@deepseek-ai/cordis'` augmentations that add
// `ctx.webServer` / `ctx.agents` (and the settings face) to the Context.
import '@deepseek-ai/dsh-host-webserver'
import '@deepseek-ai/dsh-agent'
import '@deepseek-ai/dsh-session'

const NAMESPACE = settingsNamespace(SETTINGS_NAMESPACE)

export const name = 'dsh-input-plus'
export const inject = ['settings', 'webServer', 'agents']

export default {
  name,
  inject,
  apply(ctx: Context) {
    // --- settings (optional provider) --------------------------------------
    const settings = ctx.get('settings')
    let scope: SettingsScope<InputPlusSettings> | undefined
    if (settings) {
      scope = settings.register(NAMESPACE, buildSchema(), { applies: 'live', base: { ...DEFAULTS } })
    }

    const cfg = (): InputPlusSettings => {
      const s = scope?.get()
      return {
        enabled: s?.enabled ?? DEFAULTS.enabled,
        maxFileBytes: s?.maxFileBytes ?? DEFAULTS.maxFileBytes,
        maxDirBytes: s?.maxDirBytes ?? DEFAULTS.maxDirBytes,
        maxManifestDepth: s?.maxManifestDepth ?? DEFAULTS.maxManifestDepth,
        maxIndexEntries: s?.maxIndexEntries ?? DEFAULTS.maxIndexEntries,
        referenceRoot: s?.referenceRoot ?? DEFAULTS.referenceRoot,
      }
    }

    const resolver = createWorkspaceResolver({ readOverride: () => cfg().referenceRoot })

    // --- HTTP candidate/resolve routes (browser half) -----------------------
    const json = (res: ServerResponse, status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(body))
    }

    const agentById = (id: string): Agent | undefined => {
      try {
        return ctx.agents.get(id as Parameters<typeof ctx.agents.get>[0]) as Agent | undefined
      } catch {
        return undefined
      }
    }

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_CANDIDATES,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const u = new URL(req.url ?? '/', 'http://localhost')
        const session = u.searchParams.get('session') ?? ''
        const q = u.searchParams.get('q') ?? ''
        const agent = agentById(session)
        const root = resolver.resolve(agent)
        if (!root) {
          json(res, 200, { ok: false, error: 'NO_WORKSPACE', candidates: [] } satisfies CandidatesEnvelope)
          return
        }
        try {
          const index = await indexWorkspace({
            root: normalizeRoot(root),
            maxFileBytes: cfg().maxFileBytes,
            maxDirBytes: cfg().maxDirBytes,
            maxIndexEntries: cfg().maxIndexEntries,
            maxDepth: cfg().maxManifestDepth,
          })
          const candidates = searchCandidates(index, q, cfg().maxIndexEntries)
          json(res, 200, { ok: true, candidates } satisfies CandidatesEnvelope)
        } catch {
          json(res, 200, { ok: false, error: 'INDEX_FAILED', candidates: [] } satisfies CandidatesEnvelope)
        }
      },
    }))

    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: ROUTE_RESOLVE,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const u = new URL(req.url ?? '/', 'http://localhost')
        const session = u.searchParams.get('session') ?? ''
        const rel = u.searchParams.get('rel') ?? ''
        const agent = agentById(session)
        const root = resolver.resolve(agent)
        if (!root) {
          json(res, 200, { ok: false, error: 'NO_WORKSPACE', message: 'No workspace resolved for this session.' } satisfies ResolveEnvelope)
          return
        }
        try {
          const safe = await resolveReference(normalizeRoot(root), rel)
          json(res, 200, { ok: true, kind: safe.kind } satisfies ResolveEnvelope)
        } catch (e) {
          const code: RefErrorCode = e instanceof Error && 'code' in e
            ? ((e as { code?: RefErrorCode }).code ?? 'UNKNOWN')
            : 'UNKNOWN'
          json(res, 200, { ok: false, error: code, message: (e as Error).message } satisfies ResolveEnvelope)
        }
      },
    }))

    // --- pre-step injection ---------------------------------------------------
    // Text projection of a message's content blocks (concatenates text blocks).
    const textOf = (content: readonly ContentBlock[]): string =>
      content
        .map((b) => (b && typeof b === 'object' && 'type' in b && b.type === 'text' ? (b as { text: string }).text : ''))
        .join('\n')

    ctx.on('agent/created', (ev: { agent: Agent }) => {
      const agent = ev.agent
      agent.ctx.on(
        'agent/pre-step',
        async (
          p: { agent: Agent; messages: UserMessage[] },
          next: () => Promise<PreStepDecision>,
        ): Promise<PreStepDecision> => {
          const opts = cfg()
          if (!opts.enabled) return next()
          const root = resolver.resolve(p.agent)
          if (!root) return next()

          const last = p.messages[p.messages.length - 1]
          if (!last || last.role !== 'user') return next()
          const draftText = textOf(last.content)
          if (draftText === '') return next()

          const mentions = uniqueMentions(scanMentions(draftText))
          if (mentions.length === 0) return next()

          const { blocks, errors } = await resolveToBlocks(mentions.map((m) => m.rel), {
            root: normalizeRoot(root),
            limits: {
              maxFileBytes: opts.maxFileBytes,
              maxDirBytes: opts.maxDirBytes,
              maxManifestDepth: opts.maxManifestDepth,
            },
          })
          if (blocks.length === 0) return next()

          const injected = blocks.map((b) => `${b.heading}\n\n${b.body}`).join('\n\n')
          const errorsText = errors
            .map((e) => e.message)
            .filter((x): x is string => Boolean(x))
            .join('\n')
          const injectionBody = errorsText
            ? `${injected}\n\n[reference errors]\n${errorsText}`
            : injected

          const nextMessages = p.messages.map((m, i) =>
            i === p.messages.length - 1
              ? { ...m, content: [...m.content, { type: 'text', text: injectionBody }] as ContentBlock[] }
              : m)
          return { kind: 'enter', messages: nextMessages }
        },
      )
    })
  },
}
