# dsh-input-plus

[中文说明](README-ZH.md)

Workspace path references and small composer enhancements for the DeepSeek
Harness web interface.

`dsh-input-plus` is an independent DSH bundle plugin with two parts:

- **Host half** — indexes the active workspace, enforces path safety, and serves
  the candidate and path-resolution endpoints.
- **Web Client half** — adds the official `@` path picker, file icons, `/h`
  input history, and a concise composer status dock.

The plugin does not copy, modify, or replace the DSH Harness. It keeps path
references as links and never injects referenced file contents into a message.

![File reference picker](docs/image1.png)

## Features

### `@` file and directory references

Type `@` in the DSH composer and search by file name, directory name, or path
segments. Selecting a result leaves a plain path reference in the draft:

```text
@src/contract.ts
```

The reference is not opened or expanded when the message is sent. If the agent
needs the target, it can inspect the path with the native workspace tools in
the current Session.

Directory references can be followed by an instruction:

```text
@src Find the code responsible for candidate ranking
```

The official DSH input-trigger pipeline owns the candidate menu, focus, and
write-back behavior. This plugin does not replace the official textarea,
send button, or candidate menu, and it does not override native arrow-key
behavior.

### `/h` and `/history` input history

Type `/h` or `/history` to open the history candidates through DSH's official
`/` input-trigger source. You can add a search term:

```text
/h Windows
```

History entries are ordered by recent use. Each row uses a non-emoji history
symbol and a longer prompt preview that can occupy up to two lines. The
source-scoped menu uses the available width of the composer. Selecting a row
replaces `/h` or `/history` with the full prompt; it does not send the prompt.

History is isolated per Session and keeps up to 50 entries. When a Session is
opened, its currently loaded user and steering messages seed the list. New
prompts are recorded only after the Host accepts `Session.prompt()`. Assistant
replies, system messages, plugin content, failed sends, slash commands, and
unsent drafts are excluded. No global keyboard listener is installed, so
native arrow keys remain DSH behavior.

If the console reports:

```text
[dsh-input-plus] /h and /history input history source registered.
```

but no **Input history** group appears, the source is loaded but the current
Session has no available entries yet. Send a normal prompt successfully and
open `/h` again. Switching to or reloading a Session with loaded history also
seeds its available user prompts.

### Search and ranking

- Plain queries match candidate names first: exact names, prefixes, and
  contained names rank ahead of parent-path matches.
- Queries containing `/` match path segments in order. For example,
  `src/view` can find `src/client/view.ts`, while `src/` continues within the
  `src` directory.
- Paths recently selected in the current Session are ranked first.
- Git-modified paths rank ahead of unchanged paths at the same match level.
- Shallower paths, ordinary names, and lexical order provide deterministic
  tie-breaking.

Each result shows the file or directory name first and its parent path below
it. Built-in SVG icons distinguish directories, source files, data,
configuration, archives, and other files. The picker does not use emoji icons.

### Built-in file filters

The index skips common version-control directories, dependency trees, build
outputs, caches, and IDE metadata, including `.git`, `.svn`, `.hg`, `.dsh`,
`node_modules`, `.pnpm`, `dist`, `build`, `coverage`, `.cache`, `.idea`, and
`.vscode`.

Common operating-system metadata files are also ignored with a
case-insensitive basename match:

- `desktop.ini`
- `Thumbs.db`
- `.DS_Store`

The current implementation uses this built-in filter set. It does not expose
an `ignoreDirs` option or a configurable file blacklist, keeping index behavior
small and predictable.

### Native composer status

The plugin contributes a read-only line through DSH's official
`conversation.composer.dock` seat. It appears only when useful state exists,
such as:

- the number of `@` references in the draft;
- image attachments;
- queued messages;
- a running or submitting Session;
- a closed Session.

It does not display redundant workspace or draft-length metadata and does not
change the official composer interaction.

## Usage

1. Type `@` in the composer.
2. Search for a file, directory, or path segment and select a result.
3. Continue typing the instruction after the inserted path.
4. Send the message.

To reuse an earlier prompt, type `/h` or `/history`, optionally add a search
term, and select a result to put it back into the draft.

The sent message remains ordinary user text. The plugin does not inject
`<file>` blocks, directory manifests, or file contents. PDFs, images, binary
files, and text files follow the same path-reference flow; whether the agent
can inspect a format depends on the native tools available in the Session.

## Path and security boundaries

- By default, the active workspace is resolved from
  `agent.session.header.cwd`. The `referenceRoot` setting can override it with
  an absolute path.
- The browser receives only workspace-relative paths, file/directory kind, and
  minimal display metadata. Host absolute paths and file contents do not cross
  the boundary.
- Directory depth and candidate-count caps prevent an unbounded workspace walk.
- Absolute paths, empty paths, NUL characters, and paths escaping the workspace
  are rejected.
- Symlinks pointing outside the workspace are excluded from indexing, and path
  resolution checks the real path again.
- The Host exposes same-origin JSON endpoints for candidates and path
  resolution; it does not expose file contents.

## Installation

The compatibility baseline is DSH `0.1.0-rc.6` or a compatible DSH web
profile. Install through the DSH profile plugin flow:

```bash
dsh plugin --profile web add dsh-input-plus
```

Replace `web` with another profile name when needed. Restart the DSH web
profile after installation or update so both the Host bundle and browser
Client bundle are reloaded.

This is a bundle plugin. Do not copy the source into the DSH Harness checkout
or add a separate browser injection script. `cordis.patch.yml` mounts the Host
half, and `package.json` declares the Web Client half through `dsh.client`.

## Configuration

The settings namespace is `input-plus`:

| Option | Default | Range | Description |
|---|---:|---:|---|
| `maxIndexDepth` | `3` | `0–10` | Maximum directory depth for workspace indexing |
| `maxIndexEntries` | `200` | `1–2000` | Maximum indexed entries returned to the picker |
| `referenceRoot` | `''` | absolute path or empty | Overrides the active Session workspace |

These limits apply to path indexing only. Directories are not expanded and
files are not read when a message is sent, so this version has no
`maxFileBytes`, `maxTotalBytes`, or directory-content injection mode.

## Compatibility and extension surfaces

The plugin is currently verified against DSH `0.1.0-rc.6` and uses these
official extension surfaces:

- `ctx.inputTriggers` for the `@` file source;
- `ctx.inputTriggers` for the `/` history source;
- `ctx.settings` for the `input-plus` settings namespace;
- `ctx.webServer` for candidate and path-resolution routes;
- `conversation.input` and `sessions` for current-Session submission wiring;
- `conversation.composer.dock` for the read-only status line.

The official textarea, send button, candidate menu, and keyboard arbitration
remain DSH-owned. The plugin does not install a global keyboard listener and
does not occupy the single `conversation.composer.bar` seat.

## Development

Requirements: Node.js 18+ and pnpm.

```bash
pnpm install

# TypeScript checks
pnpm run typecheck

# In-process test suite
pnpm test

# Build the Host and browser bundles
pnpm run build

# Verify that lib/client.js is synchronized with the source
pnpm run check:client
```

The build has two parts:

- `tsc -p tsconfig.build.json` emits the Host code and declarations;
- `scripts/build-client.mjs` uses the TypeScript Compiler API to generate
  `lib/client.js` in-process, avoiding an esbuild service subprocess.

## Repository layout

```text
src/
  index.ts            Host plugin entry, settings, and HTTP routes
  contract.ts         Minimal Host/Client wire contract
  host/
    files.ts          Workspace indexing, ranking, and path safety
    git.ts            Git modification state
    settings.ts       Settings schema and defaults
    workspace.ts      Session workspace resolution
  client/
    index.ts          Browser plugin entry
    input-source.ts   @ candidate source and path write-back
    history-source.ts /h and /history source and menu styles
    history-recorder.ts Current Session prompt recording
    find.ts           Client candidate matching and ranking
    file-icons.ts     Candidate icons
    input-status.ts   Composer status dock
scripts/
  build-client.mjs    Browser bundle builder
  test-runner.ts      In-process test entry
```

## License

MIT
