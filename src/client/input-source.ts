/**
 * The `@` file/directory reference input-trigger source.
 *
 * Registers with the official `ctx.inputTriggers.registerSource` pipeline. The
 * official candidate menu handles caret/token detection, keyboard arbitration,
 * and the final text write-back; this source only supplies candidates and the
 * picked plain-text reference path (the frozen "plain-text reference path"
 * decision — no placeholder/occurrence, see the input-trigger contract).
 *
 * The Host owns candidate indexing and path validation; selected references
 * remain plain text. The browser never requests or receives file contents or
 * absolute paths.
 */

import type {
  ClientSessionContext,
  InputTriggerCandidate,
  InputTriggerSource,
  PickOutcome,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { FileCandidate } from '../contract.js'
import type { FileIndexReader } from './bridge.js'
import { createFileCandidateIcon } from './file-icons.js'
import { rankFileCandidates } from './find.js'

export { rankFileCandidates } from './find.js'

export interface InputSourceDeps {
  readonly reader: FileIndexReader
  /** Optional local filter/ranker override (defaults to rankFileCandidates). */
  readonly filter?: (candidates: readonly FileCandidate[], query: string) => readonly FileCandidate[]
  /** True once the Host index is unreachable — candidates degrade to a clear message. */
  readonly isReady?: () => boolean
}

export function toMenuCandidate(c: FileCandidate): InputTriggerCandidate {
  const separator = c.relative.lastIndexOf('/')
  const name = separator < 0 ? c.relative : c.relative.slice(separator + 1)
  const parent = separator < 0 ? '.' : c.relative.slice(0, separator)
  return {
    name,
    description: parent,
    icon: createFileCandidateIcon(c.relative, c.kind === 'dir'),
    // The official menu does not render hint, so it is a stable identity
    // channel for onPick after the visible name becomes basename-only.
    hint: c.relative,
  }
}

export function createFileInputSource(deps: InputSourceDeps): InputTriggerSource {
  const recentBySession = new Map<string, string[]>()

  const recentSet = (sessionId: string): ReadonlySet<string> =>
    new Set(recentBySession.get(sessionId) ?? [])

  const remember = (sessionId: string, relative: string): void => {
    const previous = recentBySession.get(sessionId) ?? []
    const next = [relative, ...previous.filter((item) => item !== relative)].slice(0, 20)
    recentBySession.set(sessionId, next)
  }

  return {
    trigger: '@',
    name: 'File reference',
    order: 10,
    async candidates(session: ClientSessionContext, req) {
      const raw = await deps.reader.candidates(session.sessionId, req.query, req.signal)
      const ranked = deps.filter === undefined
        ? rankFileCandidates(raw, req.query, 50, recentSet(session.sessionId))
        : deps.filter(raw, req.query)
      return ranked.map(toMenuCandidate)
    },
    onPick(pick): PickOutcome {
      // Plain-text reference path: the pipeline replaces the token span with
      // this literal text. No send-time content injection is registered.
      const rel = pick.candidate.hint ?? pick.candidate.name
      remember(pick.session.sessionId, rel)
      return { text: `@${rel} ` }
    },
  }
}
