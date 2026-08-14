/**
 * Record prompts at the official Session.prompt() acceptance boundary.
 *
 * Ordinary composer sends clear the input synchronously, while the Host
 * acceptance result arrives through Session.prompt(). Watching input phases
 * therefore misses normal text sends. This adapter keeps the original draft
 * beside the input wrapper and commits it only after prompt() returns ok.
 */

import type {
  ClientContext,
  ConversationNode,
  ISessions,
  SessionFace,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { HistoryStore } from './history-source.js'

type SessionInput = ReturnType<IConversation['input']['for']>
type SubmitMode = Parameters<SessionInput['submit']>[0]
type SessionId = Parameters<ISessions['scope']>[0]
type PromptArgs = Parameters<SessionFace['prompt']>
type PromptResult = Awaited<ReturnType<SessionFace['prompt']>>
type HistoryMessage = Extract<ConversationNode, { kind: 'user' | 'steering' }>

export interface HistoryRecorderDeps {
  readonly conversation: IConversation
  readonly sessions: ISessions
  readonly history: HistoryStore
}

function shouldRecord(draft: string): boolean {
  const text = draft.trim()
  // Slash commands are commands rather than reusable natural-language prompts.
  return text !== '' && !text.startsWith('/')
}

function isHistoryMessage(node: ConversationNode): node is HistoryMessage {
  return node.kind === 'user' || node.kind === 'steering'
}

function textOfMessage(node: HistoryMessage): string {
  return node.content
    .filter((block): block is { readonly type: 'text'; readonly text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function textOfPrompt(content: PromptArgs[0]): string {
  return content
    .filter((part): part is { readonly type: 'text'; readonly text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function seedSessionHistory(history: HistoryStore, sessionId: SessionId, session: SessionFace): void {
  const drafts = session.getSnapshot().nodes
    .filter(isHistoryMessage)
    .map(textOfMessage)
  history.seed(sessionId, drafts)
}

function wireSession(deps: HistoryRecorderDeps, sessionId: SessionId): () => void {
  const sessionContext = deps.sessions.scope(sessionId) as ClientContext | undefined
  if (sessionContext === undefined) return () => undefined

  const session = deps.sessions.sessionOf(sessionContext)
  if (session === undefined) return () => undefined

  seedSessionHistory(deps.history, sessionId, session)

  const input = deps.conversation.input.for(sessionContext)
  const originalSubmit = input.submit
  const originalPrompt = session.prompt
  let pending: string | undefined

  const wrappedPrompt = async (...args: PromptArgs): Promise<PromptResult> => {
    try {
      const result = await originalPrompt.apply(session, args)
      if (result.ok) {
        const draft = pending ?? textOfPrompt(args[0])
        if (shouldRecord(draft)) deps.history.record(sessionId, draft)
      }
      return result
    } finally {
      pending = undefined
    }
  }

  const wrappedSubmit = (mode?: SubmitMode): void => {
    const draft = input.state.getSnapshot().draft
    pending = shouldRecord(draft) ? draft.trim() : undefined
    originalSubmit.call(input, mode)
  }

  input.submit = wrappedSubmit
  session.prompt = wrappedPrompt

  return (): void => {
    if (input.submit === wrappedSubmit) input.submit = originalSubmit
    if (session.prompt === wrappedPrompt) session.prompt = originalPrompt
  }
}

/** Keep the recorder attached to the current Session only. */
export function wireHistoryRecorder(deps: HistoryRecorderDeps): () => void {
  let disposeSession = (): void => undefined
  let attachedSessionId: SessionId | undefined

  const attachCurrentSession = (): void => {
    const sessionId = deps.sessions.list.getSnapshot().current
    if (sessionId === attachedSessionId) return

    disposeSession()
    attachedSessionId = sessionId
    if (sessionId !== undefined) disposeSession = wireSession(deps, sessionId)
  }

  const unsubscribe = deps.sessions.list.subscribe(attachCurrentSession)
  attachCurrentSession()

  return (): void => {
    unsubscribe()
    disposeSession()
    attachedSessionId = undefined
  }
}
