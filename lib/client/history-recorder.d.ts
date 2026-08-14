/**
 * Record prompts at the official Session.prompt() acceptance boundary.
 *
 * Ordinary composer sends clear the input synchronously, while the Host
 * acceptance result arrives through Session.prompt(). Watching input phases
 * therefore misses normal text sends. This adapter keeps the original draft
 * beside the input wrapper and commits it only after prompt() returns ok.
 */
import type { ISessions } from '@deepseek-ai/dsh-client-runtime/client';
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { HistoryStore } from './history-source.js';
export interface HistoryRecorderDeps {
    readonly conversation: IConversation;
    readonly sessions: ISessions;
    readonly history: HistoryStore;
}
/** Keep the recorder attached to the current Session only. */
export declare function wireHistoryRecorder(deps: HistoryRecorderDeps): () => void;
