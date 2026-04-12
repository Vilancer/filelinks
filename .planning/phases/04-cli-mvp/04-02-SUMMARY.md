---
phase: 04-cli-mvp
plan: 02
completed: 2026-04-06
---

# 04-02 Summary

**One-liner:** CLI package is **ESM**; `filelinks add` uses **Ink** + **React** with filterable path picks and keyboard lists; `check`/`list` stay stdout; `add` rejects `--json` (D-24); `ink-select-input` dropped (incompatible with Ink 5) in favor of a local `SelectableList` (`useInput`).

**Verified:** `pnpm exec nx run cli:test`, `cli:build`, `cli:lint` — pass.

**Key files:** `packages/cli/package.json` (type module), `packages/cli/src/lib/runAdd.ts`, `packages/cli/src/lib/add-ui/*`, `packages/cli/src/lib/pathCandidates.ts`, `packages/cli/src/lib/cli.ts`.
