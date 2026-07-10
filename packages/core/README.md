# @vilancer/filelinks-core

Core library for **filelinks** — TypeScript config schema (`defineLinks`), git staged-path helpers, link matching, and Cursor agent utilities.

Your app’s `filelinks.config.ts` **must** import from this package. The CLI lives in **[`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks)** (bin: `filelinks`).

## Install both packages

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
```

```bash
npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

## Config

```typescript
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks(
  [
    {
      trigger: 'src/**/*.ts',
      affects: [{ file: 'docs/api.md', reason: 'Keep docs in sync' }],
      severity: 'warn',
    },
  ],
  { prompt: { temperature: 0.2 } },
);
```

Then use the CLI:

```bash
filelinks list
filelinks check
```

## Package roles

| Package                                       | Role                              |
| --------------------------------------------- | --------------------------------- |
| **`@vilancer/filelinks-core`** (this package) | Library API for config + matching |
| **`@vilancer/filelinks`**                     | CLI binary consumers run          |

## Main exports

- `defineLinks` — build a typed config export
- `loadFileLinksConfig` — load `filelinks.config.ts` via jiti
- `matchStagedLinks` / `classifyStagedLinks` — staged-path matching
- Agent helpers — prompt assembly, Cursor provider, run policy

Full docs: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks).
