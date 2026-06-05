---
phase: 04-cli-mvp
plan: 01
completed: 2026-04-06
---

# 04-01 Summary

**One-liner:** `loadFileLinksConfig(startDir, { configPath })` loads an explicit file without walk-up; walk-up + `findConfigFile` unchanged when omitted.

**Verified:** `pnpm exec nx run core:test` — pass.

**Key files:** `packages/core/src/lib/configLoader.ts`, `configLoader.spec.ts`.
