// Build the browser half of the plugin (client bundle) in-process, then wrap
// it in the official `window.__ModuleLoader__.load({ id, factory })`
// registration so client-modules can mount it.
//
// WHY in-process: esbuild's native service worker spawns a subprocess over an
// IPC pipe, which the DSH file sandbox blocks (EPERM). This bundler instead
// uses the TypeScript compiler API (pure JS, no subprocess) to transpile the
// self-contained client module graph to CommonJS and inline it into a single
// factory. The client graph has zero runtime external imports (every DSH
// service is reached through the injected `ctx`; DSH package imports are
// type-only and erased), so no external module edges exist.
//
// Usage:
//   node scripts/build-client.mjs          # write lib/client.js
//   node scripts/build-client.mjs --check  # verify lib/client.js is fresh
//
// New client modules under src/client (and imports from ../contract.js) are
// picked up automatically by the graph walk.

import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = resolve(import.meta.dirname, '..')
const ENTRY = resolve(ROOT, 'src', 'client', 'index.ts')
const OUTPUT = resolve(ROOT, 'lib', 'client.js')
const PLUGIN_ID = 'dsh-input-plus'

const REL_IMPORT = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+\.js)['"]/g

/** Map a relative `./x.js` specifier to an on-disk .ts file, or null. */
function resolveSpecifier(fromFile, spec) {
  const base = spec.endsWith('.js') ? spec.slice(0, -3) : spec
  const dir = dirname(fromFile)
  for (const ext of ['.ts', '.tsx']) {
    const cand = resolve(dir, base + ext)
    try {
      readFileSync(cand)
      return cand
    } catch {
      // try next extension
    }
  }
  return null
}

/** Transpile one module to a CommonJS module body string. */
function transpile(fileAbs) {
  const src = readFileSync(fileAbs, 'utf8')
  const out = ts.transpileModule(src, {
    fileName: fileAbs,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
  })
  return out.outputText
}

/** Collect the client module graph. Returns order (module ids) and dep lists. */
function collectGraph() {
  const order = [] // fileAbs; id = position in order
  const index = new Map()
  const deps = []
  const queue = [ENTRY]
  index.set(ENTRY, -1)

  while (queue.length > 0) {
    const file = queue.shift()
    if (index.get(file) !== -1) continue
    const id = order.length
    index.set(file, id)
    order.push(file)
    const src = readFileSync(file, 'utf8')
    const re = new RegExp(REL_IMPORT.source, 'g')
    let m
    while ((m = re.exec(src)) !== null) {
      const target = resolveSpecifier(file, m[1])
      if (target === null) continue
      if (!index.has(target)) {
        index.set(target, -1)
        queue.push(target)
      }
    }
  }
  for (let id = 0; id < order.length; id += 1) {
    const file = order[id]
    deps[id] = new Set()
    const src = readFileSync(file, 'utf8')
    const re = new RegExp(REL_IMPORT.source, 'g')
    let m
    while ((m = re.exec(src)) !== null) {
      const target = resolveSpecifier(file, m[1])
      if (target !== null && index.has(target) && index.get(target) !== id) deps[id].add(index.get(target))
    }
  }
  return { order, deps }
}

/** Post-order visitation producing a stable module list (deps before dependents). */
function postOrder(order, deps) {
  const result = []
  const seen = new Set()
  const visit = (id) => {
    if (seen.has(id)) return
    seen.add(id)
    for (const d of deps[id] ?? []) visit(d)
    result.push(id)
  }
  for (let i = 0; i < order.length; i += 1) visit(i)
  return result
}

/**
 * @param {{ check?: boolean }} opts
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function generate({ check = false } = {}) {
  try {
    const { order, deps } = collectGraph()
    const list = postOrder(order, deps) // module ids in post order
    const posOf = new Map(list.map((id, pos) => [id, pos]))

    const factories = list.map((id) => {
      const file = order[id]
      const transpiled = transpile(file)
      const body = transpiled.replace(/require\((['"])(\.[^'"]+\.js)\1\)/g, (all, quote, spec) => {
        const target = resolveSpecifier(file, spec)
        const tid = target === null ? undefined : indexOf(order, target)
        const pos = tid === undefined ? undefined : posOf.get(tid)
        return pos === undefined ? all : `require(${pos})`
      })
      return `  (function (module, exports, require) {\n${indent(body, 2)}\n  })`
    })

    const entryPos = posOf.get(0)
    const loader = [
      `window.__ModuleLoader__.load({`,
      `  id: ${JSON.stringify(PLUGIN_ID)},`,
      `  factory: (require) => {`,
      `    var cache = {};`,
      `    var factories = [`,
      factories.join(',\n'),
      `    ];`,
      `    function __r(id) {`,
      `      if (cache[id]) return cache[id].exports;`,
      `      var module = { exports: {} };`,
      `      cache[id] = module;`,
      `      factories[id](module, module.exports, __r);`,
      `      return module.exports;`,
      `    }`,
      `    return __r(${entryPos});`,
      `  }`,
      `});`,
      '',
    ].join('\n')

    if (!check) {
      mkdirSync(dirname(OUTPUT), { recursive: true })
      writeFileSync(OUTPUT, loader)
      return { ok: true }
    }
    let committed = null
    try {
      committed = readFileSync(OUTPUT, 'utf8')
    } catch {
      return { ok: false, errors: [OUTPUT + ' does not exist: run node scripts/build-client.mjs'] }
    }
    if (committed !== loader) {
      return { ok: false, errors: ['client.js is stale: run node scripts/build-client.mjs (do not hand-edit generated output)'] }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, errors: ['bundle failed: ' + (e instanceof Error ? e.stack ?? e.message : String(e))] }
  }
}

function indexOf(order, file) {
  for (let i = 0; i < order.length; i += 1) if (order[i] === file) return i
  return undefined
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text.split('\n').map((l) => (l === '' ? l : pad + l)).join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const check = process.argv.includes('--check')
  const result = generate({ check })
  if (!result.ok) {
    for (const e of result.errors ?? []) console.error('[build-client] ' + e)
    process.exit(1)
  }
  console.log(check ? '[build-client] client.js is fresh (--check OK)' : '[build-client] client.js written')
}
