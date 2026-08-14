/**
 * Minimal in-process test harness.
 *
 * The node:test CLI runner spawns one child process per test file, which the
 * DSH file sandbox blocks (piped stdio EPERM). This harness runs every
 * registered test in a single process instead, so tests exercise the real
 * modules without any subprocess.
 *
 * Test modules `import { test } from '../test/harness.js'`; the runner entry
 * imports each test module (which registers cases) and then calls `runAll()`.
 */

import assert from 'node:assert/strict'

export type TestFn = () => void | Promise<void>
export { assert }

interface Case {
  readonly name: string
  readonly fn: TestFn
}

const registry: Case[] = []

export function test(name: string, fn: TestFn): void {
  registry.push({ name, fn })
}

export async function runAll(): Promise<{ passed: number; failed: number }> {
  let passed = 0
  const failures: { name: string; error: unknown }[] = []
  for (const c of registry) {
    try {
      await c.fn()
      passed += 1
    } catch (error) {
      failures.push({ name: c.name, error })
    }
  }
  for (const f of failures) {
    console.error('\n✖ ' + f.name)
    console.error('  ' + (f.error instanceof Error ? f.error.stack ?? f.error.message : String(f.error)))
  }
  console.log(`\n${passed}/${registry.length} tests passed`)
  if (failures.length > 0) console.log(`${failures.length} failed`)
  return { passed, failed: failures.length }
}
