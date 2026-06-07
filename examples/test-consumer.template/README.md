# Manual test consumer (template)

Tracked scaffold for the **local-only** manual test project. **Do not commit `examples/test-consumer/`** — it is gitignored (secrets, nested git, linked installs).

## Create your local copy

From the **filelinks** repo root:

```bash
cp -r examples/test-consumer.template examples/test-consumer
cd examples/test-consumer
pnpm install --ignore-workspace
git init
cp .env.example .env.local   # add CURSOR_API_KEY locally
```

## Layout

| Local (sibling clone) | Monorepo copy |
| --------------------- | ------------- |
| `../filelinks/packages/core` | `link:../../packages/core` |
| `../filelinks/packages/cli` | `link:../../packages/cli` |

## Smoke commands

```bash
pnpm exec nx run-many -t build --projects=core,cli   # from repo root first
cd examples/test-consumer
pnpm run list
git add apps/api/src/routes/user.ts
pnpm run check
```

Stage only the trigger (omit `openapi.yaml`) to see a **warn** violation.

## Agents (`--run-agents`)

1. Set `CURSOR_API_KEY` in `.env.local` (never commit).
2. Rebuild + `pnpm install --ignore-workspace` after **core** / **cli** changes.
3. `pnpm run check:agents`
