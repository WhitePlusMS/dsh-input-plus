/**
 * Additive input status row rendered below the official composer.
 *
 * This file intentionally uses the React runtime supplied by DSH's module
 * loader without importing a second client bundle dependency. The slot itself
 * remains a normal rc.6 React slot component; the local element shape keeps
 * the static client bundler dependency-free.
 */
import { type RenderNode } from './react-runtime.js';
export interface InputStatusProps {
    readonly session: {
        readonly running: boolean;
        readonly removed: boolean;
        readonly queue: readonly unknown[];
    };
    readonly input: {
        readonly draft: string;
        readonly imageIds: readonly unknown[];
        readonly occurrences: readonly unknown[];
        readonly phase: string;
    };
}
/** Render a compact, non-interactive status summary in the composer footer. */
export declare function InputStatus(rawProps: unknown): RenderNode;
/** Build the visible status text separately so its state rules stay testable. */
export declare function formatInputStatus(props: InputStatusProps): string;
