# Changelog

All notable changes to **dsh-input-plus** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Adopted API baseline: DSH `0.1.0-rc.6` (npm runtime; npx-resolved version,
see research/dsh-input-plus-compatibility.md). The published plugin only
promises capabilities verified against that baseline; official extension
surfaces missing from the baseline degrade per feature with one actionable
diagnostic.

## [0.1.0] - 2026-08-14

### Added

- **`@` file/directory reference** (Host + Web Client).
  - Browser half registers a source through the official
    `ctx.inputTriggers` pipeline (`registerSource`), queried from a
    same-origin HTTP candidate index served by the Host.
  - Host enforces a path-safety layer at both index/resolve time and
    **send time** (`agent/pre-step`): escapes rejected, symlinks confined to
    the workspace, size/depth/entry caps, and per-feature error codes.
  - File references inject file contents; directory references inject a
    bounded manifest (never directory contents).
  - Per-session scope from the agent workspace (`session.header.cwd`), with
    an overridable `referenceRoot` setting.
- **Session input history + double-Escape clear** — *pure state machines*
  (`src/client/keyboard.ts`, `src/client/history.ts`), fully unit-tested.
  - Session-only, in-memory, FIFO-capped (50 entries), deduped consecutive.
  - `↑`/`↓` recall with draft restore; second Escape within 600 ms clears a
    non-empty draft and records it for recall.
  - **Baseline note:** rc.6 exposes the composer keyboard command face only
    inside the single-seat composer bar. This plugin deliberately does **not**
    take that seat (it would replace the whole composer), so the machine is
    not wired to a live keyboard seam in rc.6. The browser half detects the
    gap and prints one actionable diagnostic; the machines auto-enable when
    an additive seam becomes available.
- **Host settings namespace** (`input-plus`) with a master `enabled` switch
  and size limits via the official `ctx.settings` pipeline.
- **In-process client bundler** (`scripts/build-client.mjs`): transpiles the
  self-contained client graph with the TypeScript compiler API and emits the
  official `window.__ModuleLoader__.load` wrapper — no esbuild subprocess, so
  it runs under sandboxed/no-spawn environments.
- Rust-free, dependency-light: Host runtime deps are `@deepseek-ai/schemastery`
  only; DSH packages are peer/dev dependencies.

### Security

- Path traversal (`..`), absolute paths, NUL bytes, and symlink escapes are
  rejected before any read at both query and send time.
- Size caps: 512 KiB per file, 128 KiB per directory manifest, 200 index
  entries, manifest depth 3.

## [Unreleased]

- `agent/pre-step` re-resolution failure diagnostics surfaced inline.
- Wire the input-history/double-Escape machines to the composer keyboard seam
  once DSH exposes an additive one (`wireKeyboard`).
- Profile bundle install + real WebUI verification (see research baseline).
