/**
 * Resolve the reference root (workspace directory the `@` paths resolve
 * against) at send time, defensively:
 *
 *   1. an explicit reference-root setting override (when set);
 *   2. the per-session workspace — `agent.session.header.cwd` (what the
 *      harness's own fs/bash tools resolve session-relative paths against);
 *   3. `process.cwd()` as the last resort.
 *
 * This mirrors `dsh-tool-fs`'s session-cwd convention so `@references` act on
 * the session's workspace and never on the server's launch directory by
 * accident.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
export interface WorkspaceResolver {
    /** Return the absolute reference root for this agent, or undefined if none. */
    resolve(agent?: Agent): string | undefined;
}
export declare function createWorkspaceResolver(options: {
    /** Optional settings override (absolute path, empty = unset). */
    readOverride: () => string | undefined;
}): WorkspaceResolver;
