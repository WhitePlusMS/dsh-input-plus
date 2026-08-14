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
import type { FileCandidate, ResolveEnvelope, SessionId } from '../contract.js';
export interface FileIndexReader {
    candidates(session: SessionId, query: string, signal: AbortSignal): Promise<readonly FileCandidate[]>;
    resolve(session: SessionId, rel: string, signal: AbortSignal): Promise<ResolveEnvelope>;
}
/** Transport that performs a same-origin GET returning JSON. */
export type JsonGetter = (url: string, signal: AbortSignal) => Promise<unknown>;
/**
 * HTTP bridge using the shared same-origin route prefix. `base` is optional
 * and defaults to the page origin (self-origin relative URLs).
 */
export declare function httpFileIndexReader(getter?: JsonGetter, base?: string): FileIndexReader;
