/**
 * Client-side bridge to the Host's file index.
 *
 * For a static bundle plugin the browser half reaches the Host through
 * same-origin HTTP routes served by the host's `webServer` (the documented
 * pattern used by whale-girl). This module wraps that transport so the
 * `@` input source is decoupled from the transport and unit-testable.
 *
 * The wire only ever carries `relative` paths and kind — never absolute paths
 * or file contents (see research/dsh-input-plus-file-reference.md).
 */

import type { CandidatesEnvelope, FileCandidate, ResolveEnvelope, SessionId } from '../contract.js'
import { ROUTE_CANDIDATES, ROUTE_RESOLVE } from '../contract.js'

export interface FileIndexReader {
  candidates(session: SessionId, query: string, signal: AbortSignal): Promise<readonly FileCandidate[]>
  resolve(session: SessionId, rel: string, signal: AbortSignal): Promise<ResolveEnvelope>
}

/** Transport that performs a same-origin GET returning JSON. */
export type JsonGetter = (url: string, signal: AbortSignal) => Promise<unknown>

const defaultGetter: JsonGetter = async (url, signal) => {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * HTTP bridge using the shared same-origin route prefix. `base` is optional
 * and defaults to the page origin (self-origin relative URLs).
 */
export function httpFileIndexReader(getter: JsonGetter = defaultGetter, base = ''): FileIndexReader {
  const url = (path: string) => `${base}${path}`

  async function candidates(session: SessionId, query: string, signal: AbortSignal): Promise<readonly FileCandidate[]> {
    const qs = new URLSearchParams({ session, q: query })
    const env = (await getter(url(`${ROUTE_CANDIDATES}?${qs}`), signal)) as CandidatesEnvelope
    if (!env || env.ok !== true) return []
    return Array.isArray(env.candidates) ? env.candidates : []
  }

  async function resolve(session: SessionId, rel: string, signal: AbortSignal): Promise<ResolveEnvelope> {
    const qs = new URLSearchParams({ session, rel })
    try {
      return (await getter(url(`${ROUTE_RESOLVE}?${qs}`), signal)) as ResolveEnvelope
    } catch {
      return { ok: false, error: 'CANCELLED', message: 'Reference resolution was cancelled.' }
    }
  }

  return { candidates, resolve }
}
