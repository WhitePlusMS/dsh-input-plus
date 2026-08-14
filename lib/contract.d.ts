/**
 * Shared Host/Client wire contract for dsh-input-plus.
 *
 * Deliberately tiny and "least-privilege": the browser half only ever sees
 * `sessionId + relative` identifiers and minimal display metadata. Host
 * absolute paths, file contents, and the user's draft never cross this
 * boundary (see research/dsh-input-plus-file-reference.md).
 */
/** DSH Session identifier shared as an opaque string across the wire. */
export type SessionId = string;
/** The reference can point at a regular file or a directory. */
export type RefKind = 'file' | 'dir';
/** One candidate row the Host index returns for the Client to display. */
export interface FileCandidate {
    /** Workspace-relative path (forward slashes), the only identity the Client holds. */
    readonly relative: string;
    readonly kind: RefKind;
    /** Optional single-line label for the candidate menu (defaults to `relative`). */
    readonly label?: string;
    /** True when Git currently reports the path as changed in this workspace. */
    readonly modified?: boolean;
}
/**
 * Candidate search request. `signal` is the per-request AbortSignal the
 * official input-trigger pipeline supplies; the handler must honor it.
 */
export interface CandidateSearch {
    readonly session: SessionId;
    /** The text after '@' the user has typed so far. */
    readonly query: string;
    readonly signal: AbortSignal;
}
/** Structured, stable error codes surfaced to the user. */
export type RefErrorCode = 'NOT_FOUND' | 'OUT_OF_BOUNDS' | 'SYMLINK' | 'PERMISSION' | 'CANCELLED' | 'UNKNOWN';
/**
 * Same-origin HTTP route prefix shared by the Host (webServer) and the
 * browser half (fetch). Single source of truth — never hard-code the prefix
 * anywhere else (mirrors whale-girl's verify-routes-sync practice).
 */
export declare const ROUTE_PREFIX = "/dsh-input-plus";
export declare const ROUTE_CANDIDATES = "/dsh-input-plus/candidates";
export declare const ROUTE_RESOLVE = "/dsh-input-plus/resolve";
/** JSON envelope for the candidate route. */
export interface CandidatesEnvelope {
    readonly candidates: readonly FileCandidate[];
    /** True when the response served a real (matching) session index. */
    readonly ok: boolean;
    /** Structured failure code when `ok` is false. */
    readonly error?: string;
}
/** One path-validation response used by the optional resolve route. */
export interface ResolveEnvelope {
    readonly ok: boolean;
    readonly error?: string;
    readonly message?: string;
    readonly kind?: RefKind;
}
