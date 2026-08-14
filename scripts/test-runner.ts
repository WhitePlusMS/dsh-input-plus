/**
 * In-process test runner entry.
 *
 * Imports every *.test.ts module (each registers cases via the harness) then
 * runs them in a single process. The node:test CLI spawns a child per file,
 * which the DSH sandbox blocks, so this runner avoids subprocesses entirely.
 *
 * New test files must be listed here (or added below) so they are imported.
 */

import { runAll } from '../src/test/harness.js'

await import('../src/client/history.test.js')
await import('../src/client/keyboard.test.js')
await import('../src/host/files.test.js')
await import('../src/host/mention.test.js')
await import('../src/client/find.test.js')

const { failed } = await runAll()
process.exitCode = failed > 0 ? 1 : 0
