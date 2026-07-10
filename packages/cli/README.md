# @vilancer/filelinks

CLI for **filelinks** — declare semantic links between files, then check staged git changes (and optionally run Cursor agents).

This package provides the **`filelinks`** binary. Config files import helpers from the companion library **[`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core)**.

## Install both packages

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
```

```bash
npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

## Quick start

1. Create `filelinks.config.ts` at your repo root:

```typescript
import { defineLinks } from '@vilancer/filelinks-core';

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

2. Run the CLI:

```bash
filelinks list
filelinks check
filelinks check --run-agents   # optional Cursor agents
filelinks add                  # interactive wizard
```

## Package roles

| Package                                  | Role                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| **`@vilancer/filelinks`** (this package) | CLI: `check`, `list`, `add`                                   |
| **`@vilancer/filelinks-core`**           | `defineLinks`, config loading, staged matching, agent helpers |

Full docs: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks).
