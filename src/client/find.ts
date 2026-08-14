/**
 * Pure client-side candidate matching/ranking for `@` references.
 *
 * Extracted so the exact match semantics (prefer exact-prefix, then substring,
 * then per-segment prefix) are unit-testable without a browser or host.
 */

import type { FileCandidate } from '../contract.js'

/** Rank candidates for a `@query`; exact-prefix first, then substring, then segment prefix. */
export function rankFileCandidates(candidates: readonly FileCandidate[], query: string, limit = 50): readonly FileCandidate[] {
  const q = query.toLowerCase()
  return candidates
    .map((c) => {
      const lower = c.relative.toLowerCase()
      let score = -1
      if (q === '' || lower.startsWith(q)) score = 0
      else if (lower.includes(q)) score = 1
      else if (c.relative.split('/').some((seg) => seg.toLowerCase().startsWith(q))) score = 2
      if (score < 0) return null
      return { c, score }
    })
    .filter((x): x is { c: FileCandidate; score: number } => x !== null)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
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
    .map((x) => x.c)
    .slice(0, limit)
}
