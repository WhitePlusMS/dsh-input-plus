/**
 * Reference scanning, directory manifests, and pre-step injection assembly.
 *
 * Given a submitted draft, this module:
 * - scans `@relative/path` tokens (files and directories);
 * - de-duplicates across the WHOLE draft so a file is injected at most once;
 * - resolves each token through the Host safety layer (files.ts);
 * - reads files (bounded) and renders directory manifests (bounded total),
 *   never falling back to dumping a directory's full contents;
 * - assembles the chronological user-message blocks the pre-step hook injects.
 *
 * Emits only the `@`-token suffix (the token text after '@'); the trigger char
 * itself is left in the draft and the model sees the reference path text plus
 * the injected block (matching the "plain-text reference path" decision).
 */

import { readTextBounded, resolveReference, type WorkspaceIndexOptions } from './files.js'
import type { RefErrorCode, ResolveReferenceResult } from '../contract.js'
import { DIR_MANIFEST_FILENAME } from './files.js'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/** One reference occurrence found in a draft. */
export interface FoundReference {
  /** The token text after '@', e.g. `src/main.ts`. */
  readonly rel: string
  /** Byte position of the '@' in the original draft. */
  readonly start: number
  /** Byte position one past the token. */
  readonly end: number
}

const TOKEN_PATTERN = /(?:^|[\s(])@([^\s@()]+)/g

/** Scan the draft for `@path` tokens, returning them with source spans. */
export function scanMentions(draft: string): FoundReference[] {
  const out: FoundReference[] = []
  const re = new RegExp(TOKEN_PATTERN.source, 'g')
  let m
  while ((m = re.exec(draft)) !== null) {
    if (m[1] === undefined) continue
    const start = m.index + (m[0].length - m[1].length)
    out.push({ rel: m[1], start, end: start + m[1].length })
  }
  return out
}

/** De-duplicate tokens by rel, keeping the first occurrence order. */
export function uniqueMentions(mentions: readonly FoundReference[]): FoundReference[] {
  const seen = new Set<string>()
  const out: FoundReference[] = []
  for (const m of mentions) {
    if (seen.has(m.rel)) continue
    seen.add(m.rel)
    out.push(m)
  }
  return out
}

/** Default directory-manifest depth cap. */
export const DEFAULT_MANIFEST_DEPTH = 3
/** Default per-entry size cap rendered in a manifest line. */
export const DEFAULT_ENTRY_CAP = 1024

/**
 * Render a bounded directory listing as a Markdown block. Does NOT read file
 * contents; only name, kind, and byte size (files) are listed, capped by
 * depth and a total byte budget.
 */
export async function renderDirectoryManifest(
  dirAbs: string,
  rootRel: string,
  opts: { root: string; maxDepth: number; maxBytes: number; ignored?: ReadonlySet<string> },
): Promise<{ text: string; bytes: number }> {
  const { ignored } = opts
  const lines: string[] = []
  let bytes = 0
  const sep = '/'

  const push = (line: string) => {
    // budget check: skip remaining once over budget (keeps bounded)
    if (bytes >= opts.maxBytes) return
    const cost = Buffer.byteLength(line + '\n', 'utf8')
    if (bytes + cost > opts.maxBytes) return
    lines.push(line)
    bytes += cost
  }

  const walk = async (abs: string, rel: string, depth: number): Promise<void> => {
    if (depth > opts.maxDepth) return
    let entries
    try {
      entries = await fs.readdir(abs, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (bytes >= opts.maxBytes) return
      const name = e.name
      if (ignored?.has(name)) continue
      const childAbs = join(abs, name)
      const childRel = rel === '' ? name : `${rel}${sep}${name}`
      if (e.isDirectory()) {
        push(`- ${childRel}/`)
        await walk(childAbs, childRel, depth + 1)
      } else if (e.isFile()) {
        let size = 0
        try {
          size = (await fs.stat(childAbs)).size
        } catch {
          size = 0
        }
        push(`- ${childRel} (${size} B)`)
      }
      // symlinks are listed but never followed into the manifest
    }
  }

  push(`# Directory manifest: ${rootRel}`)
  push('')
  await walk(dirAbs, '', 1)
  return { text: lines.join('\n'), bytes }
}

export interface InjectionBlock {
  readonly kind: 'file' | 'dir'
  readonly rel: string
  /** Markdown block heading. */
  readonly heading: string
  readonly body: string
}

export interface ResolveContext {
  readonly root: string
  readonly limits: Pick<WorkspaceIndexOptions, 'maxFileBytes' | 'maxDirBytes'> & { maxManifestDepth: number }
}

/**
 * Resolve a list of unique mentions into injection blocks. Each failed token
 * yields an entry in `errors` with a structured code but does not abort the
 * whole expansion (other safe references still inject).
 */
export async function resolveToBlocks(
  rels: readonly string[],
  ctx: ResolveContext,
): Promise<{ blocks: InjectionBlock[]; errors: ResolveReferenceResult[] }> {
  const blocks: InjectionBlock[] = []
  const errors: ResolveReferenceResult[] = []
  for (const rel of rels) {
    try {
      const safe = await resolveReference(ctx.root, rel)
      if (safe.kind === 'dir') {
        const manifest = await renderDirectoryManifest(safe.absolute, safe.relative, {
          root: ctx.root,
          maxDepth: ctx.limits.maxManifestDepth,
          maxBytes: ctx.limits.maxDirBytes,
        })
        blocks.push({
          kind: 'dir',
          rel: safe.relative,
          heading: `## Directory: ${safe.relative}`,
          body: manifest.text,
        })
      } else {
        const text = await readTextBounded(safe.absolute, ctx.limits.maxFileBytes)
        if (text.trim() === '') {
          blocks.push({ kind: 'file', rel: safe.relative, heading: `## File: ${safe.relative}`, body: '(empty file)' })
          continue
        }
        blocks.push({ kind: 'file', rel: safe.relative, heading: `## File: ${safe.relative}`, body: text })
      }
    } catch (err) {
      const code: RefErrorCode = err instanceof Error && 'code' in err
        ? (err as { code: RefErrorCode }).code
        : 'UNKNOWN'
      errors.push({ ok: false, error: code, message: toActionable(rel, code) })
    }
  }
  return { blocks, errors }
}

export function toActionable(rel: string, code: RefErrorCode): string {
  switch (code) {
    case 'NOT_FOUND':
      return `Cannot read "${rel}": no such file or directory.`
    case 'OUT_OF_BOUNDS':
      return `Cannot read "${rel}": it points outside the workspace.`
    case 'SYMLINK':
      return `Cannot read "${rel}": it resolves through a symlink outside the workspace.`
    case 'NOT_TEXT':
      return `Cannot read "${rel}": this file type is not a supported text file.`
    case 'TOO_LARGE':
      return `Cannot read "${rel}": file exceeds the size limit.`
    case 'DIR_TOO_LARGE':
      return `Cannot read "${rel}": directory exceeds the manifest size limit.`
    case 'PERMISSION':
      return `Cannot read "${rel}": permission denied.`
    case 'CANCELLED':
      return `Skipped reading "${rel}": request was cancelled.`
    default:
      return `Cannot read "${rel}": an unexpected error occurred.`
  }
}

/**
 * Build the final user-message blocks for a submitted draft: the original
 * draft text (with @ tokens, matching the clipping plain-text decision) plus
 * one injection block per resolved reference. Unresolvable tokens are left as
 * plain text and surfaced as errors.
 */
export async function assembleInjection(
  draft: string,
  ctx: ResolveContext,
): Promise<{ text: string; blocks: InjectionBlock[]; errors: ResolveReferenceResult[] }> {
  const mentions = uniqueMentions(scanMentions(draft))
  const rels = mentions.map((m) => m.rel)
  const { blocks, errors } = await resolveToBlocks(rels, ctx)
  const injected = assembleBlocks(blocks)
  const text = injected === '' ? draft : `${draft}\n\n${injected}`
  return { text, blocks, errors }
}

export function assembleBlocks(blocks: readonly InjectionBlock[]): string {
  if (blocks.length === 0) return ''
  return blocks.map((b) => `${b.heading}\n\n${b.body}`).join('\n\n')
}
