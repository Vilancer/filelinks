# Manual test consumer

Small git repo for linked **filelinks** smoke tests — mirrors a sibling `test` project next to a `filelinks` clone.

## Layout

| Local (sibling clone)        | This monorepo              |
| ---------------------------- | -------------------------- |
| `../filelinks/packages/core` | `link:../../packages/core` |
| `../filelinks/packages/cli`  | `link:../../packages/cli`  |

## Setup

From the **filelinks** repo root, build packages first:

```bash
pnpm exec nx run-many -t build --projects=core,cli
```

Then in this directory:

```bash
pnpm install --ignore-workspace   # standalone node_modules (omit flag if sibling repo outside monorepo)
git init   # if not already a repo
```

When this folder lives **inside** the filelinks monorepo, **`--ignore-workspace`** avoids hoisting to the root workspace (matches a real sibling **`test`** project).

## Smoke commands

```bash
pnpm run list
git add apps/api/src/routes/user.ts
pnpm run check
pnpm run check:json
```

Stage only the trigger (omit `openapi.yaml`) to see a **warn** violation.

## Agents (`--run-agents`)

1. Copy `.env.example` → `.env.local` and set `CURSOR_API_KEY`, or export it in the shell.
2. Rebuild + re-link after changing **core** or **cli** in the monorepo.
3. Stage a policy-eligible trigger, then:

```bash
pnpm run check:agents
pnpm run check:agents:json
```

CI and unit tests mock the Cursor provider; this folder is for **manual** integration only.
