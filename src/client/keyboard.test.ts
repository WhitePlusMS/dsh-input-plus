import { test, assert } from '../test/harness.js'
import { initialKeyboardState, reduce, isAtBoundary, type KeyboardInput } from './keyboard.js'
import { record, type HistoryState } from './history.js'

const NOW = 1_000_000

function input(overrides: Partial<Omit<KeyboardInput, 'now'>> & { now?: number } = {}): KeyboardInput {
  return { draft: '', caret: 0, menuOpen: false, composing: false, now: NOW, ...overrides }
}

function seededHistory(texts: string[]): HistoryState {
  let h: HistoryState = { entries: [], index: null }
  for (const t of texts) h = record(h, t)
  return h
}

function stateWith(overrides: Partial<Parameters<typeof initialKeyboardState>[0]> = {}) {
  return initialKeyboardState({ history: seededHistory([]), ...overrides })
}

test('empty draft + ArrowUp on empty history is a no-op', () => {
  const s = stateWith()
  const next = reduce(s, { type: 'vertical', dir: -1 }, input())
  assert.equal(next.draft, '')
  assert.equal(next.history.index, null)
})

test('ArrowUp at boundary recalls the newest entry and captures the live draft', () => {
  const s = stateWith({ draft: 'my live draft', caret: 'my live draft'.length, history: seededHistory(['one', 'two']) })
  const next = reduce(s, { type: 'vertical', dir: -1 }, input({ draft: s.draft, caret: s.caret }))
  assert.equal(next.draft, 'two')
  assert.equal(next.history.index, 1)
  assert.equal(next.savedDraft, 'my live draft')
})

test('ArrowUp walks older entries, clamped at the oldest', () => {
  const s = stateWith({ draft: 'x', caret: 1, history: seededHistory(['one', 'two', 'three']) })
  const s1 = reduce(s, { type: 'vertical', dir: -1 }, input({ draft: 'x', caret: 1 }))
  assert.equal(s1.draft, 'three')
  const s2 = reduce(s1, { type: 'vertical', dir: -1 }, input({ draft: s1.draft, caret: s1.caret }))
  assert.equal(s2.draft, 'two')
  const s3 = reduce(s2, { type: 'vertical', dir: -1 }, input({ draft: s2.draft, caret: s2.caret }))
  assert.equal(s3.draft, 'one')
  const s4 = reduce(s3, { type: 'vertical', dir: -1 }, input({ draft: s3.draft, caret: s3.caret }))
  assert.equal(s4.draft, 'one')
})

test('ArrowDown past the newest restores the captured draft and exits', () => {
  const s = stateWith({ draft: 'two', savedDraft: 'my live draft', history: { entries: ['one', 'two'], index: 1 } })
  const next = reduce(s, { type: 'vertical', dir: 1 }, input({ draft: 'two', caret: 3 }))
  assert.equal(next.draft, 'my live draft')
  assert.equal(next.history.index, null)
  assert.equal(next.savedDraft, null)
})

test('vertical key while the candidate menu is open is ignored (menu owns it)', () => {
  const s = stateWith({ draft: '@ma', caret: 3, history: seededHistory(['a']) })
  const next = reduce(s, { type: 'vertical', dir: -1 }, input({ draft: '@ma', caret: 3, menuOpen: true }))
  assert.equal(next.draft, '@ma')
  assert.equal(next.history.index, null)
})

test('vertical key during IME composition is ignored', () => {
  const s = stateWith({ draft: 'x', caret: 1, history: seededHistory(['a']) })
  const next = reduce(s, { type: 'vertical', dir: -1 }, input({ draft: 'x', caret: 1, composing: true }))
  assert.equal(next.draft, 'x')
})

test('non-boundary ArrowUp moves the caret, not history', () => {
  const draft = 'line1\nline2\nline3'
  const caret = 'line1\nline2'.length // start of line2
  const s = stateWith({ draft, caret, history: seededHistory(['h']) })
  assert.ok(!isAtBoundary(draft, caret, -1))
  const next = reduce(s, { type: 'vertical', dir: -1 }, input({ draft, caret }))
  assert.equal(next.draft, draft)
  assert.equal(next.caret, 'line1'.length) // moved to end of line1
})

test('double-escape clears a non-empty draft and records it to history', () => {
  const s = stateWith({ draft: 'protect me', caret: 10 })
  const armed = reduce(s, { type: 'escape' }, input({ draft: 'protect me', caret: 10 }))
  assert.equal(armed.draft, 'protect me')
  assert.equal(armed.escArmedAt, NOW)
  const cleared = reduce(armed, { type: 'escape' }, input({ draft: 'protect me', caret: 10, now: NOW + 100 }))
  assert.equal(cleared.draft, '')
  assert.equal(cleared.justCleared, true)
  assert.equal(cleared.history.entries.at(-1), 'protect me')
})

test('second escape beyond the 600ms window only re-arms', () => {
  const s = stateWith({ draft: 'do not delete', caret: 13 })
  const armed = reduce(s, { type: 'escape' }, input({ draft: 'do not delete', caret: 13 }))
  const next = reduce(armed, { type: 'escape' }, input({ draft: 'do not delete', caret: 13, now: NOW + 700 }))
  assert.equal(next.draft, 'do not delete')
  assert.equal(next.escArmedAt, NOW + 700)
  assert.equal(next.justCleared, false)
})

test('escape on an empty draft never arms or clears', () => {
  const s = stateWith({ draft: '   ' })
  const next = reduce(s, { type: 'escape' }, input({ draft: '   ' }))
  assert.equal(next.escArmedAt, null)
  assert.equal(next.draft, '   ')
})

test('starting IME composition discards an armed window', () => {
  const s = stateWith({ draft: 'text', escArmedAt: NOW })
  const next = reduce(s, { type: 'ime', composing: true }, input({ draft: 'text', caret: 4 }))
  assert.equal(next.escArmedAt, null)
})

test('editing the draft cancels the armed window and navigation', () => {
  const s = stateWith({ draft: 'old', caret: 3, escArmedAt: NOW })
  const next = reduce(s, { type: 'set-draft', draft: 'old2', caret: 4 }, input({ draft: 'old2', caret: 4 }))
  assert.equal(next.escArmedAt, null)
  assert.equal(next.justCleared, false)
})

test('submitted records the committed draft into history', () => {
  const s = stateWith({ draft: 'send me', caret: 7 })
  const next = reduce(s, { type: 'submitted' }, input({ draft: 'send me', caret: 7 }))
  assert.equal(next.history.entries.at(-1), 'send me')
})

test('submitted ignores blank drafts', () => {
  const s = stateWith({ draft: '   ' })
  const next = reduce(s, { type: 'submitted' }, input({ draft: '   ' }))
  assert.equal(next.history.entries.length, 0)
})

test('clear-after-escape recall via ArrowUp returns the cleared draft', () => {
  let s = stateWith({ draft: 'about to clear', caret: 15 })
  s = reduce(s, { type: 'escape' }, input({ draft: 'about to clear', caret: 15 }))
  s = reduce(s, { type: 'escape' }, input({ draft: 'about to clear', caret: 15, now: NOW + 50 }))
  assert.equal(s.draft, '')
  const recalled = reduce(s, { type: 'vertical', dir: -1 }, input({ draft: '', caret: 0, now: NOW + 100 }))
  assert.equal(recalled.draft, 'about to clear')
  assert.ok(recalled.history.index !== null)
})
