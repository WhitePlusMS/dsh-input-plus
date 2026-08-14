/**
 * Shared Host/Client wire contract for dsh-input-plus.
 *
 * Deliberately tiny and "least-privilege": the browser half only ever sees
 * `sessionId + relative` identifiers and minimal display metadata. Host
 * absolute paths, file contents, and the user's draft never cross this
 * boundary (see research/dsh-input-plus-file-reference.md).
 */

/** DSH Session identifier shared as an opaque string across the wire. */
export type SessionId = string

/** The reference can point at a regular file or a directory. */
export type RefKind = 'file' | 'dir'

/** One candidate row the Host index returns for the Client to display. */
export interface FileCandidate {
  /** Workspace-relative path (forward slashes), the only identity the Client holds. */
  readonly relative: string
  readonly kind: RefKind
  /** Optional single-line label for the candidate menu (defaults to `relative`). */
  readonly label?: string
}

/**
 * Result of resolving one reference at send time. The Client asks for a
 * candidate list, but the Host alone decides whether a given token is a real,
 * safe, in-workspace reference and how it serializes.
 */
export interface ResolveReferenceResult {
  readonly ok: boolean
  /** Structured error code (see {@link RefErrorCode}); only present when `ok` is false. */
  readonly error?: RefErrorCode
  /** Human-readable, actionable message (never contains absolute paths or content). */
  readonly message?: string
  /** Number of injection blocks produced (file → 1, directory → manifest blocks). */
  readonly blocks?: number
}

/**
 * Candidate search request. `signal` is the per-request AbortSignal the
 * official input-trigger pipeline supplies; the handler must honor it.
 */
export interface CandidateSearch {
  readonly session: SessionId
  /** The text after '@' the user has typed so far. */
  readonly query: string
  readonly signal: AbortSignal
}

/** Structured, stable error codes surfaced to the user. */
export type RefErrorCode =
  | 'NOT_FOUND'
  | 'OUT_OF_BOUNDS'
  | 'SYMLINK'
  | 'NOT_TEXT'
  | 'TOO_LARGE'
  | 'DIR_TOO_LARGE'
  | 'PERMISSION'
  | 'CANCELLED'
  | 'UNKNOWN'

/** Semantic constants for the input-history feature (frozen in wayfinder/tickets/02). */
export const HISTORY_LIMIT = 50
export const DOUBLE_ESCAPE_WINDOW_MS = 600
export const HISTORY_ALIAS_SEQUENCE = Object.freeze({
  up: 'ArrowUp',
  down: 'ArrowDown',
  altUp: 'ctrl-p',
  altDown: 'ctrl-n',
})

/**
 * Same-origin HTTP route prefix shared by the Host (webServer) and the
 * browser half (fetch). Single source of truth — never hard-code the prefix
 * anywhere else (mirrors whale-girl's verify-routes-sync practice).
 */
export const ROUTE_PREFIX = '/dsh-input-plus'
export const ROUTE_CANDIDATES = `${ROUTE_PREFIX}/candidates`
export const ROUTE_RESOLVE = `${ROUTE_PREFIX}/resolve`

/** JSON envelope for the candidate route. */
export interface CandidatesEnvelope {
  readonly candidates: readonly FileCandidate[]
  /** True when the response served a real (matching) session index. */
  readonly ok: boolean
  /** Structured failure code when `ok` is false. */
  readonly error?: string
}

/** One resolution (used by the Client only for display feedback; Host re-checks at pre-step). */
export interface ResolveEnvelope {
  readonly ok: boolean
  readonly error?: string
  readonly message?: string
  readonly kind?: RefKind
}
