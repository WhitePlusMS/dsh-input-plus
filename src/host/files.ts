/**
 * Host-side workspace index and path safety.
 *
 * Security model (research/dsh-input-plus-file-reference.md):
 * - The Client only ever receives `relative` paths + kind; it never sees
 *   absolute paths or file contents.
 * - Path resolution is re-validated by the Host at EVERY use (candidate
 *   selection AND hand-typed `@relative` tokens): resolve -> realpath ->
 *   relative-boundary check.
 * - Absolute paths, `..` escape out of the workspace, and symlink targets
 *   outside the workspace are rejected by default.
 * - Candidate indexing is bounded by the entry and depth caps.
 *
 * Zero DSH dependencies: this module takes the workspace root as a plain
 * string and uses only Node fs, so it is fully unit-testable in isolation.
 */

import { promises as fs } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import type { FileCandidate, RefErrorCode } from '../contract.js'

export const DEFAULT_IGNORED = new Set([
  // VCS / harness
  '.git', '.dsh', '.dsh-home', '.svn', '.hg',
  // dependencies + package managers
  'node_modules', '.pnpm-store', '.npm', '.npm-cache', '.yarn', '.pnpm',
  // build / test / coverage output
  'dist', 'build', 'out', 'coverage', '.out-test', '.turbo', '.nx', '.cache',
  // editor / OS artifacts
  '.idea', '.vscode',
])

/** OS/editor metadata files ignored by basename, case-insensitively. */
export const DEFAULT_IGNORED_FILES = new Set([
  '.ds_store',
  'desktop.ini',
  'thumbs.db',
])

export interface WorkspaceIndexOptions {
  /** Absolute workspace root. */
  readonly root: string
  /** Max index entries served as candidates per query. */
  readonly maxIndexEntries: number
  /** Directory scan depth limit. */
  readonly maxDepth: number
  /** Directories to skip entirely (basenames). */
  readonly ignored?: ReadonlySet<string>
  /** Files to skip by basename; values are compared case-insensitively. */
  readonly ignoredFiles?: ReadonlySet<string>
  /** Optional override for testing path semantics. */
  readonly sepOverride?: string
}

/** One resolved, validated reference pointing inside the workspace. */
export interface SafeReference {
  readonly absolute: string
  readonly relative: string
  readonly kind: 'file' | 'dir'
}

export class UnsupportedReferenceError extends Error {
  constructor(
    public readonly code: RefErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'UnsupportedReferenceError'
  }
}

/** The workspace root under which every reference must resolve. */
export function normalizeRoot(root: string): string {
  return resolve(root)
}

/**
 * Resolve and validate a workspace-relative path.
 *
 * Applies: absolute/empty rejection -> resolve -> realpath -> verify the
 * real target still lives under `root`. When `allowSymlink` is false (default
 * for files) the final absolute target of any symlink must also sit inside
 * the workspace (a symlink whose target leaves the workspace is rejected).
 *
 * Returns a {@link SafeReference} or throws {@link UnsupportedReferenceError}.
 */
export async function resolveReference(
  root: string,
  rel: string,
  opts: Pick<WorkspaceIndexOptions, 'sepOverride'> = {},
): Promise<SafeReference> {
  const sepCh = opts.sepOverride ?? sep
  const normalized = normalizeRelative(rel, sepCh)
  if (normalized === null) throw new UnsupportedReferenceError('OUT_OF_BOUNDS', `Rejected path: "${rel}"`)

  const targetAbs = resolve(root, normalized)
  // Belt-and-braces containment on the raw (lexical) path before any fs call.
  if (!isWithin(root, targetAbs)) {
    throw new UnsupportedReferenceError('OUT_OF_BOUNDS', `Path escapes the workspace: "${rel}"`)
  }

  let stat
  try {
    stat = await fs.lstat(targetAbs)
  } catch {
    throw new UnsupportedReferenceError('NOT_FOUND', `No such file or directory: "${rel}"`)
  }
  if (stat.isSymbolicLink()) {
    // Resolve the symlink target and verify final containment.
    const real = await realpathSafe(targetAbs)
    if (real === null || !isWithin(root, real)) {
      throw new UnsupportedReferenceError('SYMLINK', `Symbolic link points outside the workspace: "${rel}"`)
    }
    try {
      stat = await fs.stat(targetAbs)
    } catch {
      throw new UnsupportedReferenceError('NOT_FOUND', `Broken symlink: "${rel}"`)
    }
  } else {
    const real = await realpathSafe(targetAbs)
    if (real === null) throw new UnsupportedReferenceError('NOT_FOUND', `No such file or directory: "${rel}"`)
    if (!isWithin(root, real)) {
      throw new UnsupportedReferenceError('OUT_OF_BOUNDS', `Path escapes the workspace: "${rel}"`)
    }
  }

  return {
    absolute: targetAbs,
    relative: toRelative(root, targetAbs),
    kind: stat.isDirectory() ? 'dir' : 'file',
  }
}

/** Normalize `..`/`.`/duplicate separators to a forward-slash relative path, or null if unsafe. */
export function normalizeRelative(rel: string, sepCh: string = sep): string | null {
  if (typeof rel !== 'string') return null
  const trimmed = rel.trim()
  if (trimmed === '' || trimmed.startsWith('/') || trimmed.startsWith('\\')) return null
  if (trimmed.includes('\0')) return null
  const parts = trimmed.split(/[/\\]/)
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (out.length === 0) return null
      out.pop()
      continue
    }
    out.push(part)
  }
  if (out.length === 0) return null
  return out.join('/')
}

/** Is `candidate` equal to or inside `root` (path-component aware)? */
export function isWithin(root: string, candidate: string): boolean {
  const r = root.endsWith(sep) ? root : root + sep
  return candidate === root || candidate.startsWith(r)
}

/** Safe realpath; returns null on fs error (avoids throwing in validation paths). */
async function realpathSafe(p: string): Promise<string | null> {
  try {
    return await fs.realpath(p)
  } catch {
    return null
  }
}

function toRelative(root: string, absolute: string): string {
  const r = relative(root, absolute)
  return r.split(sep).join('/')
}

/**
 * Build a snapshot candidate index of the workspace.
 *
 * Skips ignored directories and metadata files, enforces depth and entry caps,
 * resolves symlinks to verify containment (a symlink leaving the workspace is
 * dropped rather than served), and returns distinguishable `file` / `dir`
 * candidates.
 */
export async function indexWorkspace(opts: WorkspaceIndexOptions): Promise<FileCandidate[]> {
  const ignored = opts.ignored ?? DEFAULT_IGNORED
  const ignoredFiles = opts.ignoredFiles ?? DEFAULT_IGNORED_FILES
  const out: FileCandidate[] = []
  const seen = new Set<string>()
  const root = normalizeRoot(opts.root)

  const walk = async (dirAbs: string, depth: number): Promise<void> => {
    if (depth > opts.maxDepth) return
    let entries
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true })
    } catch {
      return // unreadable dir is skipped silently; reads still surface real errors
    }
    for (const entry of entries) {
      if (out.length >= opts.maxIndexEntries) return
      const name = entry.name
      if (ignored.has(name) || ignoredFiles.has(name.toLowerCase())) continue
      const abs = join(dirAbs, name)
      const rel = toRelative(root, abs)
      // Symlink: resolve and only include when the real target stays inside.
      if (entry.isSymbolicLink()) {
        const real = await realpathSafe(abs)
        if (real === null || !isWithin(root, real)) continue
        let st
        try {
          st = await fs.stat(abs)
        } catch {
          continue
        }
        if (!seen.has(rel)) {
          seen.add(rel)
          out.push({ relative: rel, kind: st.isDirectory() ? 'dir' : 'file' })
        }
        if (st.isDirectory()) await walk(abs, depth + 1)
        continue
      }
      if (entry.isDirectory()) {
        if (!seen.has(rel)) {
          seen.add(rel)
          out.push({ relative: rel, kind: 'dir' })
        }
        await walk(abs, depth + 1)
      } else if (entry.isFile()) {
        if (!seen.has(rel)) {
          seen.add(rel)
          out.push({ relative: rel, kind: 'file' })
        }
      }
    }
  }

  await walk(root, 0)
  return out.slice(0, opts.maxIndexEntries)
}

/**
 * Score a candidate `relative` path against a `@query`, or return `null` when
 * it does not match. Lower is better.
 *
 * Semantics (aligned with the community `dsh-at-file` improvements):
 * - Empty query: matches everything (`0`), so ordering is purely the caller's tiebreak.
 * - Plain query (no `/`): **filename-centric** — prefer the last path segment
 *   prefix, then filename substring, then any-segment prefix, then a whole-path
 *   substring as a low fallback. Matching the *filename* (not scattered path
 *   characters) is what prevents unrelated hits like `src/draw/…` for `ra`.
 * - Path query (contains `/`): the `/`-separated query segments must match
 *   path segments **in order, as a prefix block**; a block at the path start
 *   scores better than one deeper. A trailing slash (`src/`) matches the `src`
 *   directory itself and everything under it.
 */
export function matchScore(rel: string, query: string): number | null {
  const q = query.toLowerCase()
  if (q === '') return 0
  const lower = rel.toLowerCase()
  if (!q.includes('/')) {
    const base = lower.slice(lower.lastIndexOf('/') + 1)
    if (base === q) return 0
    if (base.startsWith(q)) return 1
    if (base.includes(q)) return 2
    if (lower.split('/').some((seg) => seg.startsWith(q))) return 3
    if (lower.includes(q)) return 4
    return null
  }
  const qSeg = q.split('/').filter((s) => s !== '')
  const relSeg = lower.split('/')
  for (let j = 0; j + qSeg.length <= relSeg.length; j++) {
    let ok = true
    for (let k = 0; k < qSeg.length; k++) {
      const relPart = relSeg[j + k]
      const queryPart = qSeg[k]
      if (relPart === undefined || queryPart === undefined || !relPart.startsWith(queryPart)) {
        ok = false
        break
      }
    }
    if (ok) return j === 0 ? 1 : 2
  }
  return null
}

/** Filter + rank candidates for a `@query` (prefix/substring match, exact first). */
export function searchCandidates(index: readonly FileCandidate[], query: string, limit: number): FileCandidate[] {
  const q = query.toLowerCase()
  // token-agnostic match: prefix of any segment OR substring of the full path
  const scored = index
    .map((c) => {
      const score = matchScore(c.relative, q)
      if (score === null) return null
      return { c, score }
    })
    .filter((x): x is { c: FileCandidate; score: number } => x !== null)
    .sort((a, b) => {
      // Rank by match score first.
      if (a.score !== b.score) return a.score - b.score
      const aModified = a.c.modified === true
      const bModified = b.c.modified === true
      if (aModified !== bModified) return aModified ? -1 : 1
      // At equal score prefer shallow over deep, and non-hidden over dot-prefixed
      // (dot files / caches crowded out normal files on an empty query).
      const aRel = a.c.relative
      const bRel = b.c.relative
      const aDot = aRel.startsWith('.')
      const bDot = bRel.startsWith('.')
      if (aDot !== bDot) return aDot ? 1 : -1
      const aDepth = aRel.split('/').length
      const bDepth = bRel.split('/').length
      if (aDepth !== bDepth) return aDepth - bDepth
      return aRel.localeCompare(bRel)
    })
    .slice(0, limit)
    .map((x) => x.c)
  return scored
}
