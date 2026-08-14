# dsh-input-plus

> DSH 输入框强化 — input-box enhancements for the DeepSeek Harness (DSH) Web UI.

A small **bundle plugin** for DSH that lives in the session workspace and ships
as a publishable npm package. It is composed of a Host half running in the DSH
Node process and a Web Client half loaded by the browser.

This is an independent, self-contained repository. It does **not** vendor or
modify the DSH harness; DSH is the external host and compatibility baseline.

## Features

| # | Feature | Status (DSH `0.1.0-rc.6`) |
|---|---------|---------------------------|
| 1 | `@` file / directory reference | ✅ **Live** (additive official seam; verified in a real Installed profile + WebUI) |
| 2 | Session input history (`↑` / `↓`) | 🔶 **Pure logic, unit-tested** — not wired to a live keyboard seam in rc.6 |
| 3 | Double-`Escape` clears the draft | 🔶 **Pure logic, unit-tested** — as above |

### 1. `@` file / directory reference

Type `@…` in the composer; the browser half lists workspace-relative files and
directories through the official input-trigger pipeline. At send time the Host
re-validates every `@` token against a path-safety layer and injects:

- **file** → its text contents;
- **directory** → a bounded manifest (never the directory contents).

References resolve against the session workspace (`session.header.cwd`) unless
overridden by the `referenceRoot` setting.

### 2 & 3. Input history + double-Escape (seam-gated)

The complete, deterministic state machines for session input history and the
double-Escape clear gesture ship in this package and are fully unit-tested
(52 tests green). They are **not** wired to a live keyboard seam on the rc.6
baseline, because rc.6 composes the composer keyboard command face only inside
the single-seat composer bar — and this plugin deliberately does not take that
seat (it would replace the whole composer). The browser half detects the gap
and prints one actionable diagnostic; the machines auto-enable on a host that
exposes an additive seam (`wireKeyboard`).

> **Honesty note:** until bundle/profile install is verified end-to-end on a
> real DSH WebUI, treat the keyboard features as "unit-tested machines with a
> documented integration gap", not as a live browser behavior. See
> [Compatibility](#compatibility).

## Requirements

- DSH `0.1.0-rc.6` (npm runtime baseline — see `research/dsh-input-plus-compatibility.md`)
- Node.js 18+ (development: build/test)
- pnpm (development)

## Install

Install is done through DSH's official plugin/profile flow (the package is a
**bundle plugin** mounted at the profile level, not a dynamic sandbox plugin):

```bash
# from inside a DSH profile directory
dsh plugin --profile <profile> add dsh-input-plus
```

Because the package is composed of both a Host bundle and a Web Client bundle,
the same verification steps apply as for any DSH bundle/profile install. Mount
and configuration happen through DSH's own plugin manifest handling.

> **Compatibility:** this release pins its promises to the rc.6 baseline and
> the official extension seams verified in `research/`. Bundle/profile install
> and real WebUI loading are the target of the integration gate; if a surface
> is missing on the host it is detected and degraded with a diagnostic rather
> than silently claimed.

## Configuration

A settings namespace `input-plus` is registered through the official
`ctx.settings` pipeline:

| Key | Default | Meaning |
|-----|---------|---------|
| `enabled` | `true` | Master switch; off disables all behavior. |
| `maxFileBytes` | `524288` (512 KiB) | Max bytes for one referenced text file. |
| `maxDirBytes` | `131072` (128 KiB) | Max total bytes for a directory manifest. |
| `maxManifestDepth` | `3` | Directory manifest depth cap. |
| `maxIndexEntries` | `200` | Max candidate rows served per search. |
| `referenceRoot` | `''` | Optional absolute reference-root override; empty = session workspace. |

## Usage

In the composer:

1. Type `@` and keep typing a substring — the candidate menu lists workspace
   files/directories.
2. Pick an entry; the editor inserts a reference token.
3. Send — the Host validates the token, reads the target, and injects the
   file contents (or directory manifest) into the message context.

Nothing is sent for a reference that fails validation; a per-feature error is
surfaced instead.

## Development

```bash
pnpm install

# typecheck
pnpm run typecheck

# run the unit-test suite (privilege-safe: no subprocess spawns)
pnpm test

# build Host (`lib/`) + client bundle (`lib/client.js`)
pnpm run build
```

- Host build: `tsc -p tsconfig.build.json` (pure, in-process).
- Client build: `scripts/build-client.mjs` — an in-process bundler built on
  the TypeScript compiler API. It deliberately avoids esbuild so it works in
  sandboxed/no-spawn environments (esbuild's service worker needs an IPC pipe).

### Why no esbuild?

esbuild spawns a native service worker over an IPC pipe, which DSH's file
sandbox blocks (`EPERM`). The client graph is self-contained (every DSH
service is reached through the injected `ctx`; DSH package imports are
type-only and erased), so a small deterministic in-process bundler is both
sufficient and sandbox-friendly.

## Repository layout

```
src/
  index.ts          Host half: settings + HTTP routes + agent/pre-step injection
  contract.ts       Shared wire contract (session id, refs, envelopes, limits)
  host/             Path safety, mention scanning, injection, settings, workspace
  client/           Browser half: @ source, bridge, find ranking, keyboard/history machines
  test/harness.ts   In-process test harness (node:test spawns a child per file — avoided)
scripts/
  build-client.mjs  In-process client bundler (TS compiler API)
  test-runner.ts    Test graph runner
research/ wayfinder/ .scratch/   Planning, official-surface research, implementation tickets
```

## Compatibility

- Verified baseline: **DSH `0.1.0-rc.6`** (npm/npx runtime). Observed
  extension seams: `ctx.inputTriggers` (additive), `ctx.settings`,
  `ctx.webServer`, `agent/pre-step`.
- **Verified in a real installed profile + WebUI:** the bundle loads both
  halves through the DSH bundle/profile path (`dsh plugin add <pkg>` →
  `dsh.profile.bundles`); the Web client bundle is served
  (`/plugins/dsh-input-plus/client.js`, 200) and its `@` source registers
  through `ctx.inputTriggers` and lists workspace candidates (registration
  confirmed via the client console log). This is what was previously the open
  integration gate, and it is now exercised for the `@` feature.
- **Not yet end-to-end verified:** the `agent/pre-step` reference injection
  against a live send (compiled + unit-tested, but not yet asserted against a
  real turn on the verified host), and the input-history / double-Escape
  keyboard behaviors (seam-gated — see below).
- The rc.6 composer keyboard seam is single-seat; input-history/double-Escape
  therefore degrade (with a diagnostic) rather than replace the composer.

## License

[MIT](./LICENSE)
