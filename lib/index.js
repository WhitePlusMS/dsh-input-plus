/**
 * dsh-input-plus Host half — a static Cordis plugin.
 *
 * Responsibilities (Host-owned):
 * - expose the `@` candidate index to the browser half over same-origin HTTP
 *   routes (only `relative` + `kind` ever cross the wire);
 * - register candidate-index settings and a path-validation route;
 * - leave selected `@` references as plain user text so the model can inspect
 *   them with its native workspace tools.
 *
 * Every side effect is Fiber-owned (`ctx.effect` / `ctx.on` disposers), so
 * stop/unload removes routes, settings and listeners.
 */
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { normalizeRoot, indexWorkspace, resolveReference, searchCandidates } from './host/files.js';
import { readGitChangedFiles } from './host/git.js';
import { createWorkspaceResolver } from './host/workspace.js';
import { buildSchema, DEFAULTS, SETTINGS_NAMESPACE } from './host/settings.js';
import { ROUTE_CANDIDATES, ROUTE_RESOLVE, } from './contract.js';
// Load the `declare module '@deepseek-ai/cordis'` augmentations that add
// `ctx.webServer` / `ctx.agents` (and the settings face) to the Context.
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-agent';
const NAMESPACE = settingsNamespace(SETTINGS_NAMESPACE);
export const name = 'dsh-input-plus';
export const inject = ['settings', 'webServer', 'agents'];
export default {
    name,
    inject,
    apply(ctx) {
        // --- settings (optional provider) --------------------------------------
        const settings = ctx.get('settings');
        let scope;
        if (settings) {
            scope = settings.register(NAMESPACE, buildSchema(), { applies: 'live', base: { ...DEFAULTS } });
        }
        const cfg = () => {
            const s = scope?.get();
            return {
                enabled: s?.enabled ?? DEFAULTS.enabled,
                maxIndexDepth: s?.maxIndexDepth ?? DEFAULTS.maxIndexDepth,
                maxIndexEntries: s?.maxIndexEntries ?? DEFAULTS.maxIndexEntries,
                referenceRoot: s?.referenceRoot ?? DEFAULTS.referenceRoot,
            };
        };
        const resolver = createWorkspaceResolver({ readOverride: () => cfg().referenceRoot });
        // --- HTTP candidate/resolve routes (browser half) -----------------------
        const json = (res, status, body) => {
            res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(body));
        };
        const agentById = (id) => {
            try {
                return ctx.agents.get(id);
            }
            catch {
                return undefined;
            }
        };
        const gitCache = new Map();
        const changedFilesFor = async (root) => {
            const now = Date.now();
            const cached = gitCache.get(root);
            if (cached !== undefined && cached.expiresAt > now)
                return cached.files;
            const files = await readGitChangedFiles(root);
            gitCache.set(root, { expiresAt: now + 1500, files });
            return files;
        };
        ctx.effect(() => ctx.webServer.register({
            kind: 'exact',
            path: ROUTE_CANDIDATES,
            handler: async (req, res) => {
                const u = new URL(req.url ?? '/', 'http://localhost');
                const session = u.searchParams.get('session') ?? '';
                const q = u.searchParams.get('q') ?? '';
                const agent = agentById(session);
                const root = resolver.resolve(agent);
                if (!root) {
                    json(res, 200, { ok: false, error: 'NO_WORKSPACE', candidates: [] });
                    return;
                }
                try {
                    const index = await indexWorkspace({
                        root: normalizeRoot(root),
                        maxIndexEntries: cfg().maxIndexEntries,
                        maxDepth: cfg().maxIndexDepth,
                    });
                    const changed = await changedFilesFor(normalizeRoot(root));
                    const decorated = index.map((candidate) => changed.has(candidate.relative) ? { ...candidate, modified: true } : candidate);
                    const candidates = searchCandidates(decorated, q, cfg().maxIndexEntries);
                    json(res, 200, { ok: true, candidates });
                }
                catch {
                    json(res, 200, { ok: false, error: 'INDEX_FAILED', candidates: [] });
                }
            },
        }));
        ctx.effect(() => ctx.webServer.register({
            kind: 'exact',
            path: ROUTE_RESOLVE,
            handler: async (req, res) => {
                const u = new URL(req.url ?? '/', 'http://localhost');
                const session = u.searchParams.get('session') ?? '';
                const rel = u.searchParams.get('rel') ?? '';
                const agent = agentById(session);
                const root = resolver.resolve(agent);
                if (!root) {
                    json(res, 200, { ok: false, error: 'NO_WORKSPACE', message: 'No workspace resolved for this session.' });
                    return;
                }
                try {
                    const safe = await resolveReference(normalizeRoot(root), rel);
                    json(res, 200, { ok: true, kind: safe.kind });
                }
                catch (e) {
                    const code = e instanceof Error && 'code' in e
                        ? (e.code ?? 'UNKNOWN')
                        : 'UNKNOWN';
                    json(res, 200, { ok: false, error: code, message: e.message });
                }
            },
        }));
    },
};
