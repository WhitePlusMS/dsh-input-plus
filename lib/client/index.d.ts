/**
 * dsh-input-plus browser half.
 *
 * The plugin stays on rc.6's additive extension surfaces: the official `@`
 * input-trigger source and the composer status dock. It does not replace the
 * textarea and does not install a document-level keyboard listener.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-input-plus";
export declare const inject: string[];
export interface CapabilityProbe {
    /** `ctx.inputTriggers` present → the `@` reference source can register. */
    readonly atSource: boolean;
    /** The additive composer dock is present. */
    readonly inputStatus: boolean;
    /** Public SessionInput and Session list are present for slash history. */
    readonly history: boolean;
}
export declare function probeCapabilities(ctx: Context): CapabilityProbe;
export declare function apply(ctx: Context): void;
