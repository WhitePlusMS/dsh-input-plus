/**
 * The `@` file/directory reference input-trigger source.
 *
 * Registers with the official `ctx.inputTriggers.registerSource` pipeline. The
 * official candidate menu handles caret/token detection, keyboard arbitration,
 * and the final text write-back; this source only supplies candidates and the
 * picked plain-text reference path (the frozen "plain-text reference path"
 * decision — no placeholder/occurrence, see the input-trigger contract).
 *
 * The Host owns candidate indexing and path validation; selected references
 * remain plain text. The browser never requests or receives file contents or
 * absolute paths.
 */
import type { InputTriggerCandidate, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { FileCandidate } from '../contract.js';
import type { FileIndexReader } from './bridge.js';
export { rankFileCandidates } from './find.js';
export interface InputSourceDeps {
    readonly reader: FileIndexReader;
    /** Optional local filter/ranker override (defaults to rankFileCandidates). */
    readonly filter?: (candidates: readonly FileCandidate[], query: string) => readonly FileCandidate[];
    /** True once the Host index is unreachable — candidates degrade to a clear message. */
    readonly isReady?: () => boolean;
}
export declare function toMenuCandidate(c: FileCandidate): InputTriggerCandidate;
export declare function createFileInputSource(deps: InputSourceDeps): InputTriggerSource;
