# filelinks

A language-agnostic tool for declaring semantic relationships between files — so your AI agent, git hook, or editor knows what to check when something changes.

## Install

Install the **`filelinks`** CLI and, in the project where the config file lives, **`@filelinks/core`** (your `filelinks.config.ts` imports `defineLinks` from it; Node resolves that import from **your** app’s `node_modules`, not from inside the CLI).

```bash
pnpm add -D filelinks @filelinks/core
```

```bash
npm install --save-dev filelinks @filelinks/core
```

## Config

Create **`filelinks.config.ts`** at the repo root (or use **`--config`** to point to another path):

```typescript
import { defineLinks } from '@filelinks/core';

export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      severity: 'warn',
    },
  ],
  { prompt: { temperature: 0.2 } },
);
```

## Commands

Global options: **`--cwd <dir>`** (default: current directory), **`--config <path>`**, **`--json`**, **`--verbose`**.

### `filelinks check`

Compare **staged** files to your links; print violations; exit **1** if any missing companion has **`severity: 'error'`**.

```bash
filelinks check
filelinks check --json
filelinks check --cwd /path/to/repo --config ./my/filelinks.config.ts
```

### `filelinks list`

Print all declared links (table, or **`--json`**).

```bash
filelinks list
filelinks list --json
```

### `filelinks add`

Interactive terminal UI (**Ink** + **React**): enter a **trigger** glob, **filter and pick** affected file paths from the repo (no need to type full paths), choose **severity** and optional **linkType**, then **create or rewrite** `filelinks.config.ts` (safe full-file rewrite). Does **not** support **`--json`** (use `check` / `list` for machine-readable output).

```bash
filelinks add
```

## Local development (this repo)

From the monorepo root, build **core** first (the CLI depends on it), then the CLI:

```bash
pnpm exec nx run core:build
pnpm exec nx run cli:build
node packages/cli/dist/src/index.js --version
node packages/cli/dist/src/index.js list --cwd packages/core/src/lib/__fixtures__/sample-filelinks-config
```

Run tests: **`pnpm test`** (see **`CONTRIBUTING.md`**). The published CLI package is **ESM** (`"type": "module"`). If you use **`pnpm link filelinks`** (or a **`file:`** CLI) in another repo, install **`@filelinks/core`** in that repo too — see **Trying the CLI in another directory** in **`CONTRIBUTING.md`** for **`file:`** examples and link steps.
