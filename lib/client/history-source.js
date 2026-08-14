/**
 * Slash-trigger source for recalling previously submitted user prompts.
 *
 * This deliberately uses the official `/` trigger instead of a DOM keydown
 * listener. `/h` and `/history` are the only accepted command prefixes, so
 * ordinary DSH slash commands keep their own source groups and semantics.
 */
export const HISTORY_SOURCE_NAME = '输入历史';
export const HISTORY_TRIGGER = '/';
export const HISTORY_LIMIT = 50;
const MAX_PREVIEW_LENGTH = 240;
/** Create a small in-memory, per-Session history store. */
export function createHistoryStore(limit = HISTORY_LIMIT) {
    const entries = new Map();
    return {
        record(sessionId, draft) {
            const text = draft.trim();
            if (text === '')
                return;
            const previous = entries.get(sessionId) ?? [];
            if (previous[0] === text)
                return;
            entries.set(sessionId, [text, ...previous].slice(0, limit));
        },
        seed(sessionId, drafts) {
            const previous = entries.get(sessionId) ?? [];
            const known = new Set(previous);
            const missing = [];
            for (const draft of drafts) {
                const text = draft.trim();
                if (text === '' || known.has(text))
                    continue;
                known.add(text);
                missing.push(text);
            }
            if (missing.length > 0) {
                entries.set(sessionId, [...previous, ...missing.reverse()].slice(0, limit));
            }
        },
        list(sessionId) {
            return entries.get(sessionId) ?? [];
        },
    };
}
/** Return the text filter after `/h` or `/history`; null means not our source. */
export function historyFilter(query) {
    const value = query.trim();
    const lower = value.toLowerCase();
    if (lower === 'h')
        return '';
    if (lower === 'history')
        return '';
    if (lower.startsWith('h '))
        return value.slice(2).trim();
    if (lower.startsWith('history '))
        return value.slice('history '.length).trim();
    return null;
}
/** Build the two-line-capable visible label while keeping the full draft hidden in `hint`. */
export function historyCandidate(text) {
    const compact = text.replace(/\s+/g, ' ').trim();
    const name = compact.length > MAX_PREVIEW_LENGTH
        ? `${compact.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
        : compact;
    return {
        name,
        icon: '↺',
        hint: text,
    };
}
export function createHistoryInputSource(store) {
    return {
        trigger: HISTORY_TRIGGER,
        name: HISTORY_SOURCE_NAME,
        order: 20,
        async candidates(session, req) {
            const filter = historyFilter(req.query);
            if (filter === null)
                return [];
            const lower = filter.toLowerCase();
            return store
                .list(session.sessionId)
                .filter((text) => lower === '' || text.toLowerCase().includes(lower))
                .map(historyCandidate);
        },
        onPick(pick) {
            return { text: pick.candidate.hint ?? pick.candidate.name };
        },
    };
}
const HISTORY_OPTION_PREFIX = 'dsh-slash-option-输入历史-';
const HISTORY_STYLE_ID = 'dsh-input-plus-history-menu';
/**
 * The official menu is intentionally compact and single-line for paths. Only
 * rows belonging to this source receive the wider, two-line history layout.
 */
export const HISTORY_MENU_CSS = `
[role="listbox"]:has(button[id^="${HISTORY_OPTION_PREFIX}"]) {
  width: 100%;
  max-width: 100%;
}
[role="listbox"]:has(button[id^="${HISTORY_OPTION_PREFIX}"]) > div {
  width: 100%;
}
button[id^="${HISTORY_OPTION_PREFIX}"] {
  width: 100%;
  min-height: 54px;
  box-sizing: border-box;
  align-items: flex-start;
}
button[id^="${HISTORY_OPTION_PREFIX}"] > span:first-child {
  margin-top: 2px;
}
button[id^="${HISTORY_OPTION_PREFIX}"] > span:nth-child(2) {
  flex: 1;
  min-width: 0;
  max-width: none;
  overflow: hidden;
  white-space: normal;
  line-height: 20px;
  text-overflow: clip;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
`;
/** Install and return a disposer for the source-scoped history menu rules. */
export function installHistoryMenuStyles() {
    if (typeof document === 'undefined')
        return () => undefined;
    if (document.getElementById(HISTORY_STYLE_ID) !== null)
        return () => undefined;
    const target = document.head ?? document.documentElement;
    if (target === null)
        return () => undefined;
    const style = document.createElement('style');
    style.id = HISTORY_STYLE_ID;
    style.textContent = HISTORY_MENU_CSS;
    target.append(style);
    return () => style.remove();
}
