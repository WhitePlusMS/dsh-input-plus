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
import type { Context } from '@deepseek-ai/cordis';
import '@deepseek-ai/dsh-host-webserver';
import '@deepseek-ai/dsh-agent';
export declare const name = "dsh-input-plus";
export declare const inject: string[];
declare const _default: {
    name: string;
    inject: string[];
    apply(ctx: Context): void;
};
export default _default;
