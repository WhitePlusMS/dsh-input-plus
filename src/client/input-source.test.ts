import type { InputTriggerPick } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { test, assert } from '../test/harness.js'
import type { ResolveEnvelope } from '../contract.js'
import { createFileInputSource, toMenuCandidate } from './input-source.js'

test('file candidate shows basename, parent path, and a vector icon', () => {
  const candidate = toMenuCandidate({
    relative: 'app/src/main/java/HooConfig.kt',
    kind: 'file',
  })

  assert.equal(candidate.name, 'HooConfig.kt')
  assert.equal(candidate.description, 'app/src/main/java')
  assert.equal(candidate.hint, 'app/src/main/java/HooConfig.kt')
  assert.ok(candidate.icon !== undefined)
})

test('directory candidate keeps the same filename/path layout', () => {
  const candidate = toMenuCandidate({
    relative: 'app/src/main/java/socialLogin',
    kind: 'dir',
  })

  assert.equal(candidate.name, 'socialLogin')
  assert.equal(candidate.description, 'app/src/main/java')
  assert.equal(candidate.hint, 'app/src/main/java/socialLogin')
})

test('picking a basename-only row still inserts the full relative path', () => {
  const emptyResolve: ResolveEnvelope = { ok: false, error: 'NOT_FOUND' }
  const source = createFileInputSource({
    reader: {
      candidates: async () => [],
      resolve: async () => emptyResolve,
    },
  })
  const pick: InputTriggerPick = {
    candidate: {
      name: 'HooConfig.kt',
      description: 'app/src/main/java',
      hint: 'app/src/main/java/HooConfig.kt',
    },
    session: { sessionId: 'session-1' as InputTriggerPick['session']['sessionId'] },
    position: 'leading',
    via: 'menu',
    span: { start: 0, end: 1, draftRev: 1 },
  }

  assert.deepEqual(source.onPick(pick), { text: '@app/src/main/java/HooConfig.kt ' })
})
