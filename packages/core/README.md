# @vilancer/filelinks-core

Library for **[filelinks](https://www.npmjs.com/package/@vilancer/filelinks)** — the tool that declares file-to-file relationships, checks them against **staged git** changes, and can run **Cursor AI agents** to update linked files.

This package is what your app imports. The CLI binary is **[`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks)** (`filelinks` on the PATH).

## Why you need this package

`filelinks.config.ts` lives in **your** project and must resolve:

```typescript
import { defineLinks } from '@vilancer/filelinks-core';
```

Install **both**:

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
# or: npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

## What this library provides

- **`defineLinks`** — typed config export (links + global options)
- **Config loading** — `loadFileLinksConfig` (jiti loads `.ts` configs)
- **Staged matching** — `matchStagedLinks` / `classifyStagedLinks` (minimatch + `linkType`)
- **AI / Cursor agents** — prompt assembly, provider registry, run policies, Cursor SDK integration used by `filelinks check --run-agents`

## Config example (with AI agent)

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
      agent: {
        provider: 'cursor',
        runtime: 'local',
        model: 'composer-2.5',
        runPolicy: 'trigger-or-affects',
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
    prompt: { temperature: 0.2 },
  },
);
```

Then run the CLI from [`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks):

```bash
filelinks add                 # creates filelinks.config.ts if missing
filelinks check
filelinks check --run-agents  # Cursor AI updates for policy-eligible links
```

## Related package

| Package                               | npm                                                           | Role                                        |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- |
| **`@vilancer/filelinks-core`** (this) | [npm](https://www.npmjs.com/package/@vilancer/filelinks-core) | Library API                                 |
| **`@vilancer/filelinks`**             | [npm](https://www.npmjs.com/package/@vilancer/filelinks)      | CLI: `check`, `list`, `add`, `--run-agents` |

Full docs: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks).
