/**
 * Record prompts at the official Session.prompt() acceptance boundary.
 *
 * Ordinary composer sends clear the input synchronously, while the Host
 * acceptance result arrives through Session.prompt(). Watching input phases
 * therefore misses normal text sends. This adapter keeps the original draft
 * beside the input wrapper and commits it only after prompt() returns ok.
 */
function shouldRecord(draft) {
    const text = draft.trim();
    // Slash commands are commands rather than reusable natural-language prompts.
    return text !== '' && !text.startsWith('/');
}
function isHistoryMessage(node) {
    return node.kind === 'user' || node.kind === 'steering';
}
function textOfMessage(node) {
    return node.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
}
function textOfPrompt(content) {
    return content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');
}
function seedSessionHistory(history, sessionId, session) {
    const drafts = session.getSnapshot().nodes
        .filter(isHistoryMessage)
        .map(textOfMessage);
    history.seed(sessionId, drafts);
}
function wireSession(deps, sessionId) {
    const sessionContext = deps.sessions.scope(sessionId);
    if (sessionContext === undefined)
        return () => undefined;
    const session = deps.sessions.sessionOf(sessionContext);
    if (session === undefined)
        return () => undefined;
    seedSessionHistory(deps.history, sessionId, session);
    const input = deps.conversation.input.for(sessionContext);
    const originalSubmit = input.submit;
    const originalPrompt = session.prompt;
    let pending;
    const wrappedPrompt = async (...args) => {
        try {
            const result = await originalPrompt.apply(session, args);
            if (result.ok) {
                const draft = pending ?? textOfPrompt(args[0]);
                if (shouldRecord(draft))
                    deps.history.record(sessionId, draft);
            }
            return result;
        }
        finally {
            pending = undefined;
        }
    };
    const wrappedSubmit = (mode) => {
        const draft = input.state.getSnapshot().draft;
        pending = shouldRecord(draft) ? draft.trim() : undefined;
        originalSubmit.call(input, mode);
    };
    input.submit = wrappedSubmit;
    session.prompt = wrappedPrompt;
    return () => {
        if (input.submit === wrappedSubmit)
            input.submit = originalSubmit;
        if (session.prompt === wrappedPrompt)
            session.prompt = originalPrompt;
    };
}
/** Keep the recorder attached to the current Session only. */
export function wireHistoryRecorder(deps) {
    let disposeSession = () => undefined;
    let attachedSessionId;
    const attachCurrentSession = () => {
        const sessionId = deps.sessions.list.getSnapshot().current;
        if (sessionId === attachedSessionId)
            return;
        disposeSession();
        attachedSessionId = sessionId;
        if (sessionId !== undefined)
            disposeSession = wireSession(deps, sessionId);
    };
    const unsubscribe = deps.sessions.list.subscribe(attachCurrentSession);
    attachCurrentSession();
    return () => {
        unsubscribe();
        disposeSession();
        attachedSessionId = undefined;
    };
}
