# dsh-input-plus

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

[中文说明](README-ZH.md)

An input composer enhancement plugin for the DSH Web UI. On the Host side, it builds an index of the active workspace. In the browser, it connects to DSH's official `@` input trigger so files and directories can be searched and inserted into the composer. Type `/h` to open a candidate menu of previous prompts from the current Session.

![File reference candidate menu](docs/image1.png)

![Input history menu](docs/image2.png)

## Features

### `@` file and directory path selection

Type `@` in the DSH composer, then continue with a file name, directory name, or path fragment. The candidate menu lists files and directories from the current Session workspace. After selection, the draft keeps a plain-text path reference, for example:

```text
@src/contract.ts
```

The reference contains only the path. Sending the message does not read the file, expand the directory, or generate a directory manifest. When the model needs the target, it can inspect the path with the native workspace tools provided by the current Session.

After selecting a directory, you can continue with an instruction:

```text
@src Find the code responsible for candidate ranking
```

The official input-trigger pipeline owns the candidate menu, caret, and write-back behavior. This plugin does not replace the official textarea, send button, or candidate menu, and it does not take over native arrow-key behavior.

### `/h` input history

Type `/h` in the composer to open the history candidate menu through DSH's official `/` input trigger. You can continue typing a keyword to filter the results, for example:

```text
/h
```

The candidates contain only user prompts that were successfully submitted in the current Session, ordered from most recent to oldest.

## Installation

Requires DSH `0.1.0-rc.6` or a compatible DSH Web profile. Install through the official DSH profile plugin flow:

```bash
dsh plugin --profile web add https://github.com/WhitePlusMS/dsh-input-plus/archive/refs/tags/v0.0.1.tar.gz
```

## Configuration

The plugin registers the `input-plus` settings namespace. The options used by workspace indexing and path resolution are:

| Option | Default | Range | Description |
|---|---:|---:|---|
| `maxIndexDepth` | `3` | `0–10` | Maximum workspace indexing depth |
| `maxIndexEntries` | `200` | `1–2000` | Maximum number of entries retained per candidate index |
| `referenceRoot` | `''` | Absolute path or empty | Overrides the current Session workspace; empty uses the Session workspace |

## Development

Requirements: Node.js 18+ and pnpm.

```bash
pnpm install

# TypeScript type checking
pnpm run typecheck

# Run the in-process test suite
pnpm test

# Build the Host and browser bundles
pnpm run build

# Check that lib/client.js is synchronized with the source
pnpm run check:client
```

The build has two parts:

- `tsc -p tsconfig.build.json` generates the Host code and declaration files;
- `scripts/build-client.mjs` uses the TypeScript Compiler API to generate `lib/client.js` in-process, avoiding an esbuild service subprocess in restricted environments.

## Repository layout

```text
src/
  index.ts            Host plugin entry, settings, and HTTP routes
  contract.ts         Minimal Host/Client wire contract
  host/
    files.ts          Workspace indexing, matching, and path safety
    git.ts            Git modification state
    settings.ts       Settings schema and defaults
    workspace.ts      Session workspace resolution
  client/
    index.ts          Browser plugin entry
    input-source.ts   @ candidate source and path write-back
    history-source.ts /h and /history candidate source and two-line menu styles
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
