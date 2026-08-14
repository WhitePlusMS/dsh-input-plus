import { test, assert } from '../test/harness.js'
import { parseGitStatus } from './git.js'

test('parseGitStatus keeps only safe workspace-relative paths', () => {
  const out = parseGitStatus(' M src/main.ts\0?? notes/today.md\0 D ../outside.txt\0')
  assert.deepEqual([...out], ['src/main.ts', 'notes/today.md'])
})
