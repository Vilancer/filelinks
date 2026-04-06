# filelinks

A language-agnostic tool for declaring semantic relationships between files — so your AI agent, git hook, or editor knows what to check when something changes.

## Install

```bash
pnpm add -D filelinks
# or
npm install filelinks
```

The CLI package name on npm is **`filelinks`**. Core types and `defineLinks` live in **`@filelinks/core`** (pulled in as a dependency of the CLI).

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

Interactively add a link and **create or rewrite** `filelinks.config.ts` (safe full-file rewrite).

```bash
filelinks add
```

## Local development (this repo)

```bash
pnpm exec nx run cli:build
node packages/cli/dist/src/index.js --version
node packages/cli/dist/src/index.js list --cwd packages/core/src/lib/__fixtures__/sample-filelinks-config
```

Run tests: `pnpm test` (see **`CONTRIBUTING.md`**). To try the built CLI against **another clone or a fresh git repo**, see **Trying the CLI in another directory** in **`CONTRIBUTING.md`**.
