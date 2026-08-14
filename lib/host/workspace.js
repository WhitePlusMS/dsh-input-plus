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
export function createWorkspaceResolver(options) {
    return {
        resolve(agent) {
            const override = options.readOverride()?.trim();
            if (override)
                return override;
            const sessionCwd = agent?.session?.header?.cwd;
            if (sessionCwd)
                return sessionCwd;
            return process.cwd();
        },
    };
}
