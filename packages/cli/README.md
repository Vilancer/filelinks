# @vilancer/filelinks

**filelinks** declares semantic relationships between files in a git repo (for example “when this route changes, keep the OpenAPI spec in sync”), then checks **staged** changes against those links.

This package is the **CLI** (`filelinks` binary). Pair it with [`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core) — your `filelinks.config.ts` imports `defineLinks` from core.

## What it does

1. **Declare links** in TypeScript config (`trigger` → `affects`)
2. **`filelinks check`** — report missing companions for staged files (warn/error exit codes)
3. **`filelinks check --run-agents`** — optionally run **Cursor AI agents** to update linked files when a link’s agent policy matches
4. **`filelinks list` / `filelinks add`** — inspect links, or use the interactive wizard to **create `filelinks.config.ts` if it does not exist** (or append a link if it does), including agent/model setup

## AI agents (Cursor)

Opt-in agent runs use the [Cursor](https://cursor.com) provider:

```bash
export CURSOR_API_KEY=...   # or --cursor-api-key / .env.local
filelinks check --run-agents
```

Configure agents in config (global defaults and/or per link):

```typescript
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      agent: {
        provider: 'cursor',
        runtime: 'local', // or 'cloud' + cloud.repos
        model: 'composer-2.5',
        runPolicy: 'trigger-only', // or 'trigger-or-affects'
        local: { cwd: '.' },
      },
    },
  ],
  {
    agent: {
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
      local: { cwd: '.' },
    },
  },
);
```

- **Auth:** `--cursor-api-key` → `CURSOR_API_KEY` env → `.env.local` / `.env` under `--cwd`
- **Policies:** `trigger-only` (default) or `trigger-or-affects`
- **Runtimes:** `local` (+ `cwd`) or `cloud` (+ `repos`)
- **Wizard:** `filelinks add` can set agent defaults, models, and prompts interactively

## Install

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
# or: npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

## Quick start

No config yet? Run the wizard — it **creates** `filelinks.config.ts` for you:

```bash
filelinks add
```

Or write the file yourself:

```typescript
// filelinks.config.ts
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks([
  {
    trigger: 'apps/api/src/routes/user.ts',
    affects: [
      { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
    ],
    severity: 'warn',
  },
]);
```

```bash
filelinks list
filelinks check
filelinks check --run-agents
filelinks add    # also works when the config already exists (adds another link)
```

## Related package

| Package                          | npm                                                           | Role                                   |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| **`@vilancer/filelinks`** (this) | [npm](https://www.npmjs.com/package/@vilancer/filelinks)      | CLI binary                             |
| **`@vilancer/filelinks-core`**   | [npm](https://www.npmjs.com/package/@vilancer/filelinks-core) | `defineLinks`, matching, agent helpers |

Full docs: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks).
