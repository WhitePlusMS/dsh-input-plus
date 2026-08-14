import { test, assert } from '../test/harness.js'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  normalizeRoot,
  resolveReference,
  normalizeRelative,
  isWithin,
  UnsupportedReferenceError,
  indexWorkspace,
  searchCandidates,
  readTextBounded,
  isTextish,
  type WorkspaceIndexOptions,
} from './files.js'

async function scratch() {
  const dir = join(tmpdir(), `dsh-input-plus-${Date.now()}-${Math.floor(Math.random() * 1e6)}`)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

const opts: WorkspaceIndexOptions = {
  root: '',
  maxFileBytes: 1024 * 1024,
  maxDirBytes: 64 * 1024,
  maxIndexEntries: 1000,
  maxDepth: 4,
}

test('normalizeRelative rejects escapes, absolutes, empty', () => {
  assert.equal(normalizeRelative('../out'), null)
  assert.equal(normalizeRelative('a/../../b'), null)
  assert.equal(normalizeRelative('/abs'), null)
  assert.equal(normalizeRelative(''), null)
  assert.equal(normalizeRelative('  '), null)
  assert.equal(normalizeRelative('src/./main.ts'), 'src/main.ts')
  assert.equal(normalizeRelative('src\\main.ts', '\\'), 'src/main.ts')
})

test('isWithin is component-aware', () => {
  const root = 'C:\\ws'
  assert.ok(isWithin(root, 'C:\\ws'))
  assert.ok(isWithin(root, 'C:\\ws\\a\\b'))
  assert.ok(!isWithin(root, 'C:\\wsa'))
  assert.ok(!isWithin(root, 'C:\\ws..'))
})

test('resolveReference accepts an in-workspace file', async () => {
  const dir = await scratch()
  await fs.writeFile(join(dir, 'a.md'), 'hello')
  const safe = await resolveReference(dir, 'a.md')
  assert.equal(safe.kind, 'file')
  assert.equal(safe.relative, 'a.md')
  await fs.rm(dir, { recursive: true, force: true })
})

test('resolveReference rejects traversal and absolute paths', async () => {
  const dir = await scratch()
  await fs.writeFile(join(dir, 'a.md'), 'x')
  for (const bad of ['../a.md', 'a/../../etc/passwd', 'C:\\Windows\\win.ini', '/etc/passwd', '']) {
    await assert.rejects(resolveReference(dir, bad), UnsupportedReferenceError)
  }
  await fs.rm(dir, { recursive: true, force: true })
})

test('resolveReference rejects a missing file', async () => {
  const dir = await scratch()
  await assert.rejects(resolveReference(dir, 'missing.ts'), (e: unknown) =>
    e instanceof UnsupportedReferenceError && e.code === 'NOT_FOUND')
  await fs.rm(dir, { recursive: true, force: true })
})

test('resolveReference accepts a directory', async () => {
  const dir = await scratch()
  await fs.mkdir(join(dir, 'sub'), { recursive: true })
  const safe = await resolveReference(dir, 'sub')
  assert.equal(safe.kind, 'dir')
  await fs.rm(dir, { recursive: true, force: true })
})

test('resolveReference rejects a symlink escaping the workspace', async () => {
  const dir = await scratch()
  const outside = await scratch()
  await fs.writeFile(join(outside, 'secret.txt'), 'top secret')
  try {
    await fs.symlink(join(outside, 'secret.txt'), join(dir, 'leak.txt'))
    await assert.rejects(resolveReference(dir, 'leak.txt'), (e: unknown) =>
      e instanceof UnsupportedReferenceError && e.code === 'SYMLINK')
  } catch {
    // symlink creation not permitted (Windows dev mode / privileges): skip
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
    await fs.rm(outside, { recursive: true, force: true })
  }
})

test('readTextBounded enforces type and size limits', async () => {
  const dir = await scratch()
  const bin = join(dir, 'image.png')
  await fs.writeFile(bin, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  await assert.rejects(readTextBounded(bin, 1024), (e: unknown) =>
    e instanceof UnsupportedReferenceError && e.code === 'NOT_TEXT')
  const txt = join(dir, 'big.txt')
  await fs.writeFile(txt, 'x'.repeat(200))
  await assert.rejects(readTextBounded(txt, 100), (e: unknown) =>
    e instanceof UnsupportedReferenceError && e.code === 'TOO_LARGE')
  assert.equal(await readTextBounded(txt, 500), 'x'.repeat(200))
  await fs.rm(dir, { recursive: true, force: true })
})

test('isTextish distinguishes text extensions', () => {
  assert.ok(isTextish('a.ts'))
  assert.ok(isTextish('a.md'))
  assert.ok(!isTextish('a.png'))
  assert.ok(!isTextish('a.exe'))
  assert.ok(!isTextish('README')) // no extension
})

test('indexWorkspace lists files and dirs, skipping ignored dirs', async () => {
  const dir = await scratch()
  await fs.mkdir(join(dir, 'src'), { recursive: true })
  await fs.mkdir(join(dir, 'node_modules'), { recursive: true })
  await fs.writeFile(join(dir, 'README.md'), '# hi')
  await fs.writeFile(join(dir, 'src', 'main.ts'), 'export {}')
  await fs.writeFile(join(dir, 'node_modules', 'x.js'), 'x')
  const idx = await indexWorkspace({ ...opts, root: dir })
  const rels = idx.map((c) => c.relative).sort()
  assert.deepEqual(rels, ['README.md', 'src', 'src/main.ts'])
  await fs.rm(dir, { recursive: true, force: true })
})

test('searchCandidates ranks by prefix then substring', async () => {
  const idx = [
    { relative: 'src/main.ts', kind: 'file' as const },
    { relative: 'src/util/helper.ts', kind: 'file' as const },
    { relative: 'README.md', kind: 'file' as const },
  ]
  const out = searchCandidates(idx, 'src', 10)
  assert.equal(out[0]?.relative, 'src/main.ts')
})

test('normalizeRoot resolves relative roots to absolute', () => {
  const resolved = normalizeRoot('.')
  assert.ok(resolved.length > 0)
  assert.ok(!resolved.startsWith('.'))
})
