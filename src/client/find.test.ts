import { test, assert } from '../test/harness.js'
import { rankFileCandidates } from './find.js'

const CANDIDATES = [
  { relative: 'src/main.ts', kind: 'file' as const },
  { relative: 'src/lib/util.ts', kind: 'file' as const },
  { relative: 'docs', kind: 'dir' as const },
  { relative: 'README.md', kind: 'file' as const },
  { relative: 'docs/guide.md', kind: 'file' as const },
]

test('empty query returns all in stable order', () => {
  const out = rankFileCandidates(CANDIDATES, '')
  assert.equal(out.length, CANDIDATES.length)
})

test('exact prefix matches all prefix entries, excluding others', () => {
  const out = rankFileCandidates(CANDIDATES, 'src')
  const rels = out.map((c) => c.relative)
  assert.ok(rels.includes('src/main.ts'))
  assert.ok(rels.includes('src/lib/util.ts'))
  assert.ok(!rels.includes('README.md'))
  assert.ok(!rels.includes('docs'))
  assert.equal(rels.length, 2)
})

test('substring match is ranked after prefix', () => {
  const out = rankFileCandidates(CANDIDATES, 'util')
  assert.deepEqual(out.map((c) => c.relative), ['src/lib/util.ts'])
})

test('segment prefix matches directory segments', () => {
  const out = rankFileCandidates(CANDIDATES, 'doc')
  assert.ok(out.some((c) => c.relative === 'docs'))
  assert.ok(out.some((c) => c.relative === 'docs/guide.md'))
})

test('exact directory name outranks a file whose path starts with the query', () => {
  const candidates = [
    { relative: 'src/main.ts', kind: 'file' as const },
    { relative: 'packages/src', kind: 'dir' as const },
  ]
  const out = rankFileCandidates(candidates, 'src')
  assert.deepEqual(out.map((c) => c.relative), ['packages/src', 'src/main.ts'])
})

test('no match returns empty', () => {
  assert.equal(rankFileCandidates(CANDIDATES, 'zzz-not-here').length, 0)
})

test('limit caps the result set', () => {
  const out = rankFileCandidates(CANDIDATES, '', 2)
  assert.equal(out.length, 2)
})

test('recent and Git-modified files win equal query matches', () => {
  const candidates = [
    { relative: 'src/normal.ts', kind: 'file' as const },
    { relative: 'src/changed.ts', kind: 'file' as const, modified: true },
    { relative: 'src/recent.ts', kind: 'file' as const },
  ]
  const out = rankFileCandidates(candidates, 'src', 10, new Set(['src/recent.ts']))
  assert.deepEqual(out.map((c) => c.relative), ['src/recent.ts', 'src/changed.ts', 'src/normal.ts'])
})
