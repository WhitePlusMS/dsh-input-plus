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
import { ROUTE_CANDIDATES, ROUTE_RESOLVE } from '../contract.js';
const defaultGetter = async (url, signal) => {
    const res = await fetch(url, { signal });
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    return res.json();
};
/**
 * HTTP bridge using the shared same-origin route prefix. `base` is optional
 * and defaults to the page origin (self-origin relative URLs).
 */
export function httpFileIndexReader(getter = defaultGetter, base = '') {
    const url = (path) => `${base}${path}`;
    async function candidates(session, query, signal) {
        const qs = new URLSearchParams({ session, q: query });
        const env = (await getter(url(`${ROUTE_CANDIDATES}?${qs}`), signal));
        if (!env || env.ok !== true)
            return [];
        return Array.isArray(env.candidates) ? env.candidates : [];
    }
    async function resolve(session, rel, signal) {
        const qs = new URLSearchParams({ session, rel });
        try {
            return (await getter(url(`${ROUTE_RESOLVE}?${qs}`), signal));
        }
        catch {
            return { ok: false, error: 'CANCELLED', message: 'Reference resolution was cancelled.' };
        }
    }
    return { candidates, resolve };
}
