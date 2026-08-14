import { test, assert } from '../test/harness.js'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scanMentions, uniqueMentions, assembleInjection, renderDirectoryManifest, toActionable } from './mention.js'
import type { ResolveContext } from './mention.js'

test('scanMentions finds @ tokens after whitespace', () => {
  const out = scanMentions('read @src/main.ts now and @docs too')
  assert.equal(out.length, 2)
  assert.equal(out[0]?.rel, 'src/main.ts')
  assert.equal(out[1]?.rel, 'docs')
})

test('scanMentions ignores user@host and email-like tokens', () => {
  const out = scanMentions('mail me@host.com and pick @file.ts')
  assert.deepEqual(out.map((m) => m.rel), ['file.ts'])
})

test('uniqueMentions de-duplicates preserving order', () => {
  const mentions = scanMentions('@a @b @a @c')
  const uniq = uniqueMentions(mentions)
  assert.deepEqual(uniq.map((m) => m.rel), ['a', 'b', 'c'])
})

test('toActionable produces actionable, safe messages', () => {
  assert.match(toActionable('x.ts', 'NOT_FOUND'), /no such file/)
  assert.match(toActionable('x.ts', 'OUT_OF_BOUNDS'), /outside the workspace/)
  assert.ok(!toActionable('x.ts', 'NOT_FOUND').includes('C:\\'))
})

async function ctxFor(root: string): Promise<ResolveContext> {
  return { root, limits: { maxFileBytes: 1024 * 1024, maxDirBytes: 64 * 1024, maxManifestDepth: 3 } }
}

test('assembleInjection injects a file body once', async () => {
  const dir = join(tmpdir(), `dsh-inj-${Date.now()}`)
  await fs.mkdir(join(dir, 'src'), { recursive: true })
  await fs.writeFile(join(dir, 'src', 'main.ts'), 'export const X = 1\n')
  const r = await assembleInjection('please read @src/main.ts', await ctxFor(dir))
  assert.equal(r.errors.length, 0)
  assert.equal(r.blocks.length, 1)
  assert.equal(r.blocks[0]?.kind, 'file')
  assert.match(r.text, /export const X = 1/)
  // duplicate reference injected once
  const r2 = await assembleInjection('@src/main.ts and again @src/main.ts', await ctxFor(dir))
  assert.equal(r2.blocks.length, 1)
  await fs.rm(dir, { recursive: true, force: true })
})

test('assembleInjection renders a directory manifest, not full contents', async () => {
  const dir = join(tmpdir(), `dsh-dir-${Date.now()}`)
  await fs.mkdir(join(dir, 'proj', 'src'), { recursive: true })
  await fs.writeFile(join(dir, 'proj', 'readme.md'), 'secret body that must NOT appear')
  await fs.writeFile(join(dir, 'proj', 'src', 'a.ts'), 'a')
  const r = await assembleInjection('list @proj', await ctxFor(dir))
  assert.equal(r.blocks.length, 1)
  assert.equal(r.blocks[0]?.kind, 'dir')
  // manifest lists entries relative to the directory, and the heading carries the rel path
  assert.match(r.blocks[0]!.body, /readme\.md/)
  assert.match(r.blocks[0]!.heading, /proj/)
  // directory contents are NOT injected
  assert.ok(!r.blocks[0]!.body.includes('secret body that must NOT appear'))
  await fs.rm(dir, { recursive: true, force: true })
})

test('assembleInjection reports a missing reference as an error, keeps others', async () => {
  const dir = join(tmpdir(), `dsh-err-${Date.now()}`)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(join(dir, 'ok.txt'), 'fine')
  const r = await assembleInjection('@missing.ts and @ok.txt', await ctxFor(dir))
  assert.equal(r.blocks.length, 1)
  assert.equal(r.errors.length, 1)
  assert.equal(r.errors[0]?.error, 'NOT_FOUND')
  await fs.rm(dir, { recursive: true, force: true })
})

test('renderDirectoryManifest caps total bytes', async () => {
  const dir = join(tmpdir(), `dsh-cap-${Date.now()}`)
  await fs.mkdir(dir, { recursive: true })
  for (let i = 0; i < 20; i += 1) await fs.writeFile(join(dir, `f${i}.txt`), 'x'.repeat(50))
  const { bytes } = await renderDirectoryManifest(dir, 'cap', { root: dir, maxDepth: 3, maxBytes: 512 })
  assert.ok(bytes <= 512)
  await fs.rm(dir, { recursive: true, force: true })
})
