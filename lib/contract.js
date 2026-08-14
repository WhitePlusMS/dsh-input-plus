/**
 * Shared Host/Client wire contract for dsh-input-plus.
 *
 * Deliberately tiny and "least-privilege": the browser half only ever sees
 * `sessionId + relative` identifiers and minimal display metadata. Host
 * absolute paths, file contents, and the user's draft never cross this
 * boundary (see research/dsh-input-plus-file-reference.md).
 */
/**
 * Same-origin HTTP route prefix shared by the Host (webServer) and the
 * browser half (fetch). Single source of truth — never hard-code the prefix
 * anywhere else (mirrors whale-girl's verify-routes-sync practice).
 */
export const ROUTE_PREFIX = '/dsh-input-plus';
export const ROUTE_CANDIDATES = `${ROUTE_PREFIX}/candidates`;
export const ROUTE_RESOLVE = `${ROUTE_PREFIX}/resolve`;
