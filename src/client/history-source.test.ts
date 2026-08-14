import type { InputTriggerPick } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { test, assert } from '../test/harness.js'
import {
  createHistoryInputSource,
  createHistoryStore,
  historyCandidate,
  historyFilter,
  HISTORY_MENU_CSS,
  HISTORY_SOURCE_NAME,
} from './history-source.js'

test('history accepts /h and /history, including a text filter', () => {
  assert.equal(historyFilter('h'), '')
  assert.equal(historyFilter('history'), '')
  assert.equal(historyFilter('h Windows'), 'Windows')
  assert.equal(historyFilter('history Windows'), 'Windows')
  assert.equal(historyFilter('help'), null)
})

test('history keeps recent drafts per Session and deduplicates consecutive sends', () => {
  const history = createHistoryStore(2)
  history.record('session-a', 'first')
  history.record('session-a', 'second')
  history.record('session-a', 'second')
  history.record('session-a', 'third')
  history.record('session-b', 'other')

  assert.deepEqual(history.list('session-a'), ['third', 'second'])
  assert.deepEqual(history.list('session-b'), ['other'])
})

test('history seeds existing session prompts without reordering known entries', () => {
  const history = createHistoryStore(3)
  history.record('session-a', 'newest')
  history.seed('session-a', ['oldest', 'middle', 'newest'])
  history.seed('session-a', ['oldest', 'middle', 'newest'])

  assert.deepEqual(history.list('session-a'), ['newest', 'middle', 'oldest'])
})

test('history candidate keeps the full draft in hint and exposes a history symbol', () => {
  const candidate = historyCandidate('first line\nsecond line')
  assert.equal(candidate.icon, '↺')
  assert.equal(candidate.name, 'first line second line')
  assert.equal(candidate.hint, 'first line\nsecond line')
})

test('history source returns matching candidates and replaces the slash token', async () => {
  const history = createHistoryStore()
  history.record('session-1', 'Fix the Windows metadata filter')
  history.record('session-1', 'Review the candidate ranking')
  const source = createHistoryInputSource(history)

  assert.equal(source.name, HISTORY_SOURCE_NAME)
  const candidates = await source.candidates(
    { sessionId: 'session-1' as InputTriggerPick['session']['sessionId'] },
    { query: 'h Windows', position: 'leading', signal: new AbortController().signal },
  )
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0]?.hint, 'Fix the Windows metadata filter')

  const pick: InputTriggerPick = {
    candidate: candidates[0] ?? { name: 'missing' },
    session: { sessionId: 'session-1' as InputTriggerPick['session']['sessionId'] },
    position: 'leading',
    via: 'menu',
    span: { start: 0, end: 8, draftRev: 1 },
  }
  assert.deepEqual(source.onPick(pick), { text: 'Fix the Windows metadata filter' })
})

test('history source does not claim ordinary slash commands', async () => {
  const source = createHistoryInputSource(createHistoryStore())
  const candidates = await source.candidates(
    { sessionId: 'session-1' as InputTriggerPick['session']['sessionId'] },
    { query: 'help', position: 'leading', signal: new AbortController().signal },
  )
  assert.deepEqual(candidates, [])
})

test('history menu CSS gives the source rows a full-width two-line layout', () => {
  assert.match(HISTORY_MENU_CSS, /width: 100%/)
  assert.match(HISTORY_MENU_CSS, /-webkit-line-clamp: 2/)
})
