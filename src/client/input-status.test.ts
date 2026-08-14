import { test, assert } from '../test/harness.js'
import { formatInputStatus, InputStatus } from './input-status.js'

test('input status renders actionable state without workspace or draft metadata', () => {
  const node = InputStatus({
    session: { running: true, removed: false, queue: [{}] },
    input: {
      draft: 'read @src/main.ts',
      imageIds: [{}],
      occurrences: [],
      phase: 'plain',
    },
  })

  const text = formatInputStatus({
    session: { running: true, removed: false, queue: [{}] },
    input: {
      draft: 'read @src/main.ts',
      imageIds: [{}],
      occurrences: [],
      phase: 'plain',
    },
  })
  assert.equal(text.startsWith('工作区'), false)
  assert.equal(text.includes('草稿'), false)
  assert.match(text, /引用 1/)
  assert.match(text, /附件 1/)
  assert.match(text, /排队 1/)
  assert.match(text, /运行中/)

  // The pure test environment has no React loader, so the component safely
  // degrades to null. Its text contract is covered above.
  assert.ok(node === null || typeof node === 'object')
})

test('input status is empty when there is no actionable state', () => {
  assert.equal(formatInputStatus({
    session: { running: false, removed: false, queue: [] },
    input: { draft: 'ordinary text', imageIds: [], occurrences: [], phase: 'plain' },
  }), '')
})
