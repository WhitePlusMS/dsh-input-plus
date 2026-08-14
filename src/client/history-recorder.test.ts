import type {
  ClientContext,
  ISessions,
  SessionFace,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { test, assert } from '../test/harness.js'
import { createHistoryStore } from './history-source.js'
import { wireHistoryRecorder } from './history-recorder.js'

type SessionInput = ReturnType<IConversation['input']['for']>
type InputState = ReturnType<SessionInput['state']['getSnapshot']>
type SessionSnapshot = ReturnType<SessionFace['getSnapshot']>
type SubmitMode = Parameters<SessionInput['submit']>[0]
type PromptResult = Awaited<ReturnType<SessionFace['prompt']>>

test('history records an ordinary accepted composer send and seeds existing messages', async () => {
  const sessionId = 'session-1'
  let inputState = { draft: 'new question' } as InputState
  const session = {
    getSnapshot: () => ({
      nodes: [{ kind: 'user', content: [{ type: 'text', text: 'existing question' }] }],
    } as unknown as SessionSnapshot),
    prompt: async (): Promise<PromptResult> => ({ ok: true, value: { accepted: true } }),
  } as unknown as SessionFace

  const originalSubmit = (_mode?: SubmitMode): void => {
    const draft = inputState.draft
    inputState = { ...inputState, draft: '' }
    void session.prompt([{ type: 'text', text: draft }], 'queue')
  }
  const input = {
    state: {
      getSnapshot: () => inputState,
      subscribe: () => () => undefined,
    },
    submit: originalSubmit,
  } as unknown as SessionInput
  const conversation = {
    input: { for: () => input },
  } as unknown as IConversation
  const list = {
    getSnapshot: () => ({ current: sessionId }),
    subscribe: () => () => undefined,
  } as unknown as ISessions['list']
  const sessions = {
    list,
    scope: () => ({} as unknown as ClientContext),
    sessionOf: () => session,
  } as unknown as ISessions
  const history = createHistoryStore()

  const dispose = wireHistoryRecorder({ conversation, sessions, history })
  input.submit()
  await Promise.resolve()
  dispose()

  assert.deepEqual(history.list(sessionId), ['new question', 'existing question'])
})
