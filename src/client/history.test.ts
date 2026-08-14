import { test, assert } from '../test/harness.js'
import { emptyHistory, navigate, record, entryAt, justExited } from './history.js'

test('record appends a non-empty draft', () => {
  const h = record(emptyHistory(), 'hello')
  assert.equal(h.entries.length, 1)
  assert.equal(h.entries[0], 'hello')
})

test('record ignores empty / blank drafts', () => {
  const h = record(emptyHistory(), '   ')
  assert.equal(h.entries.length, 0)
  assert.equal(record(emptyHistory(), '').entries.length, 0)
})

test('consecutive identical submission collapses to one entry', () => {
  let h = emptyHistory()
  h = record(h, 'same')
  h = record(h, 'same')
  assert.equal(h.entries.length, 1)
})

test('non-consecutive identical text is recorded again', () => {
  let h = emptyHistory()
  h = record(h, 'a')
  h = record(h, 'b')
  h = record(h, 'a')
  assert.deepEqual(h.entries, ['a', 'b', 'a'])
})

test('history is capped at HISTORY_LIMIT (50)', () => {
  let h = emptyHistory()
  for (let i = 0; i < 60; i += 1) h = record(h, `item ${i}`)
  assert.equal(h.entries.length, 50)
  assert.equal(h.entries[0], 'item 10')
  assert.equal(h.entries[49], 'item 59')
})

test('record exits any navigation session', () => {
  let h = emptyHistory()
  h = record(h, 'one')
  h = record(h, 'two')
  h = navigate(h, false) // ArrowUp -> index 1
  assert.equal(h.index, 1)
  h = record(h, 'three')
  assert.equal(h.index, null)
  assert.equal(h.entries.length, 3)
})

test('navigate up jumps to newest then moves older, clamped', () => {
  let h = emptyHistory()
  for (const t of ['one', 'two', 'three']) h = record(h, t)
  h = navigate(h, false) // index 2
  assert.equal(h.index, 2)
  h = navigate(h, false) // index 1
  assert.equal(h.index, 1)
  h = navigate(h, false) // index 0
  assert.equal(h.index, 0)
  h = navigate(h, false) // clamp at 0
  assert.equal(h.index, 0)
})

test('navigate down moves newer and exits past the newest', () => {
  let h = emptyHistory()
  for (const t of ['one', 'two', 'three']) h = record(h, t)
  h = navigate(h, false) // index 2 (three)
  h = navigate(h, false) // index 1 (two)
  assert.equal(h.index, 1)
  h = navigate(h, true) // index 2 (three)
  assert.equal(h.index, 2)
  h = navigate(h, true) // at newest: exit -> null
  assert.equal(h.index, null)
  assert.ok(justExited({ entries: h.entries, index: 2 }, h))
})

test('navigate down while not browsing is a no-op', () => {
  const h = record(emptyHistory(), 'a')
  assert.equal(navigate(h, true).index, null)
})

test('entryAt returns the entry or null', () => {
  const h0 = emptyHistory()
  assert.equal(entryAt(h0), null)
  let h = record(h0, 'hello')
  h = navigate(h, false)
  assert.equal(entryAt(h), 'hello')
})

test('navigate on empty history is a no-op', () => {
  const h = emptyHistory()
  assert.equal(navigate(h, false), h)
})
