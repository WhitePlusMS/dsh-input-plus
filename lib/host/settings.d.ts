/**
 * Host settings schema + defaults for dsh-input-plus.
 *
 * The schemastery schema is the single source for the *user-facing* knobs;
 * defaults live in DEFAULTS and are the only default literals (single source,
 * mirroring whale-girl's config practice).
 */
import z from '@deepseek-ai/schemastery';
export declare const SETTINGS_NAMESPACE = "input-plus";
export declare const DEFAULTS: Readonly<{
    /** Master switch: when off, no input-enhancement behavior registers. */
    enabled: true;
    /** Max workspace depth scanned for directory candidates. */
    maxIndexDepth: 3;
    /** Max candidate rows served per search. */
    maxIndexEntries: 200;
    /** Optional absolute reference-root override; empty = session workspace. */
    referenceRoot: "";
}>;
export interface InputPlusSettings {
    enabled: boolean;
    maxIndexDepth: number;
    maxIndexEntries: number;
    referenceRoot: string;
}
export declare function buildSchema(): z<InputPlusSettings>;
