/**
 * Slash-trigger source for recalling previously submitted user prompts.
 *
 * This deliberately uses the official `/` trigger instead of a DOM keydown
 * listener. `/h` and `/history` are the only accepted command prefixes, so
 * ordinary DSH slash commands keep their own source groups and semantics.
 */
import type { InputTriggerCandidate, InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
export declare const HISTORY_SOURCE_NAME = "\u8F93\u5165\u5386\u53F2";
export declare const HISTORY_TRIGGER = "/";
export declare const HISTORY_LIMIT = 50;
export interface HistoryStore {
    record(sessionId: string, draft: string): void;
    seed(sessionId: string, drafts: readonly string[]): void;
    list(sessionId: string): readonly string[];
}
/** Create a small in-memory, per-Session history store. */
export declare function createHistoryStore(limit?: number): HistoryStore;
/** Return the text filter after `/h` or `/history`; null means not our source. */
export declare function historyFilter(query: string): string | null;
/** Build the two-line-capable visible label while keeping the full draft hidden in `hint`. */
export declare function historyCandidate(text: string): InputTriggerCandidate;
export declare function createHistoryInputSource(store: HistoryStore): InputTriggerSource;
/**
 * The official menu is intentionally compact and single-line for paths. Only
 * rows belonging to this source receive the wider, two-line history layout.
 */
export declare const HISTORY_MENU_CSS = "\n[role=\"listbox\"]:has(button[id^=\"dsh-slash-option-\u8F93\u5165\u5386\u53F2-\"]) {\n  width: 100%;\n  max-width: 100%;\n}\n[role=\"listbox\"]:has(button[id^=\"dsh-slash-option-\u8F93\u5165\u5386\u53F2-\"]) > div {\n  width: 100%;\n}\nbutton[id^=\"dsh-slash-option-\u8F93\u5165\u5386\u53F2-\"] {\n  width: 100%;\n  min-height: 54px;\n  box-sizing: border-box;\n  align-items: flex-start;\n}\nbutton[id^=\"dsh-slash-option-\u8F93\u5165\u5386\u53F2-\"] > span:first-child {\n  margin-top: 2px;\n}\nbutton[id^=\"dsh-slash-option-\u8F93\u5165\u5386\u53F2-\"] > span:nth-child(2) {\n  flex: 1;\n  min-width: 0;\n  max-width: none;\n  overflow: hidden;\n  white-space: normal;\n  line-height: 20px;\n  text-overflow: clip;\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n}\n";
/** Install and return a disposer for the source-scoped history menu rules. */
export declare function installHistoryMenuStyles(): () => void;
