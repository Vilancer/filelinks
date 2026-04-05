# Phase 4: CLI MVP — RESEARCH.md

**Date:** 2026-04-05  
**Confidence:** Research is scoped to locked decisions in `04-CONTEXT.md` (Commander, exit semantics, `--json`, explicit config path, `normalizeError`).

## User Constraints (from CONTEXT — MUST HONOR)

Copy of locked decisions (IDs preserved for planner traceability):

- **D-01–D-05:** Omitted `severity` → **`warn`** for policy exit; exit **1** on runtime/config/git failure or any **error**-severity missing companion; exit **0** otherwise; warnings printed but do not force non-zero alone.
- **D-06–D-09:** Human **`check`/`list`** → **stdout**; fatals → **stderr** via **`normalizeError`**; **`list`** one row per **affect**; **`--json`** on **`check`** and **`list`**.
- **D-10–D-13:** **`add`** interactive: trigger, multiple `{file, reason}`, severity, optional `linkType`; create minimal file if missing; append without corrupting or fail; minimal prompt deps (discretion).
- **D-14–D-17:** **`--cwd`**, **`--config`**, **`--version`/`-V`**, optional **`--verbose`**; **`bin`** on publishable **`filelinks`** package.
- **D-18:** **`normalizeError`** at CLI boundaries; exit **1** + stderr for failures.
- **Deferred:** git-hook, suggest, graph, VS Code, Nx plugin — **out of scope**.

## Standard Stack (prescriptive)

| Concern          | Choice                                    | Notes                                                                                                                                        |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI framework    | **Commander** (`commander`)               | Locked by phase name / CONTEXT; subcommands `check`, `list`, `add`.                                                                          |
| Runtime          | **Node** (repo already TS + CJS packages) | `bin` shebang `#!/usr/bin/env node`.                                                                                                         |
| Monorepo build   | **Nx `@nx/js:tsc`**                       | CLI `main`: `packages/cli/src/index.ts` → `dist/packages/cli`; **`bin`** must point to **built** `.js` under `dist/packages/cli/`.           |
| Core integration | **`@filelinks/core`**                     | `loadFileLinksConfig`, `findConfigFile`, `getStagedFilePaths`, `getGitRepoRoot`, `matchStagedLinks`, `normalizeError`, `defineLinks`, types. |
| Testing          | **Vitest** + Nx `cli:test`                | Mirror `core` patterns; mock `child_process` or temp dirs for git where needed.                                                              |

**Do not introduce** alternative CLIs (yargs, oclif) — **Commander** is fixed.

## Architecture Patterns

### Global options

- Parse **`--cwd`** and **`--config`** with **Commander** at **program level** (or shared hook) so every subcommand receives resolved `{ cwd, configPath? }`.
- **`--cwd`** defaults to `process.cwd()`; resolve to absolute before passing to core/git.

### Explicit config path (D-15)

- **Today:** `findConfigFile(startDir)` walks up; `loadFileLinksConfig(startDir)` finds path then loads.
- **Needed:** `loadFileLinksConfig` (or a **new** exported function) accepts an **optional absolute or resolved path** to `filelinks.config.ts`. When provided, **skip** directory walk and load that file with **jiti** (same validation as today).
- **Planner:** Add e.g. **`loadFileLinksConfigFromResolvedFile(resolvedPath: string)`** or **`loadFileLinksConfig(startDir: string, options?: { configPath?: string })`** — second form avoids export explosion; document in `packages/core/src/index.ts`.

### `check` pipeline

1. Resolve config via `--config` or `findConfigFile(cwd)`.
2. **`getStagedFilePaths(cwd)`** — wrap in try/catch → **`normalizeError`** → exit 1 + stderr.
3. **`matchStagedLinks(staged, links)`** — for each `StagedLinkMatch` with `missingAffected.length > 0`, compute **effective severity** = `entry.severity ?? 'warn'`.
4. Print each missing row (human or JSON). Exit **1** if **any** missing row has effective severity **`error`**; else **0**.

### `list` pipeline

1. Load config (same resolution as check).
2. Expand each `FileLinkEntry` to **one output row per `affects[]` item** (repeat trigger); columns: Trigger, Affected (file), Reason, Severity (effective), linkType.

### `add` — safe file updates (Claude’s discretion within D-11–D-12)

**Recommended:** **Full-file rewrite** after successful load:

1. **`loadFileLinksConfig`** returns `{ links, config }`.
2. Build **`newLinks = [...links, newEntry]`** (validate `newEntry` with schema/`defineLinks` decode path).
3. **Serialize** `export default defineLinks(<linksArray>, <configObject>)` as **valid TypeScript** source. Using **`JSON.stringify`** for inner string values is acceptable for MVP paths/reasons; preserve **`defineLinks`** import path from **`@filelinks/core`**.
4. **Write** atomically (write temp + rename) optional — planner discretion.

**Avoid:** fragile half-file string inserts into arbitrary user formatting — **rewrite** from canonical data satisfies “append” semantically (D-12).

### Prompts for `add`

- **Minimal deps:** Node **`readline/promises`** or **`readline`** callbacks — no mandatory `@inquirer/prompts`\*\* unless planner adds a task to justify bundle size.

## Don’t Hand-Roll

| Problem           | Use                                          |
| ----------------- | -------------------------------------------- |
| argv parsing      | **Commander**                                |
| Config validation | **`@filelinks/core`** Schema / `defineLinks` |
| Unknown errors    | **`normalizeError`**                         |

## Common Pitfalls

- **`bin` path** must target **`dist/.../cli.js`** (or `index.js` entry that calls `main()`), not `src/`, after `nx build cli`.
- **Workspace protocol:** `filelinks` package should depend on **`@filelinks/core`** via **`workspace:*`** in root pnpm workspace.
- **Git errors:** `execFileSync` throws — always **`try/catch`** at CLI boundary.
- **JSON output:** stable field names; document in README.

## Code Examples (reference)

- Commander: `program.name('filelinks').option('--cwd <path>').option('--config <path>')` then `program.command('check').action(...)`.
- Exit: `process.exitCode = 1` or `process.exit(1)` once after flushing stdout/stderr.

## Project Constraints (from `.cursor/rules/` / AGENTS.md)

- **Nx + pnpm**; tests via **`pnpm exec nx run cli:test`** (add `test` target if missing in `project.json`).
- **Public API** from barrels; specs as **`*.spec.ts`** next to sources.
- **`linkType`** optional; do not break configs without it.

## Validation Architecture

Nyquist validation is **disabled** for this run (`nyquist_validation_enabled: false`) — no `04-VALIDATION.md` artifact.

---

## RESEARCH COMPLETE

Planner may proceed to `04-01-PLAN.md` … `04-03-PLAN.md` with tasks referencing **D-xx** IDs from `04-CONTEXT.md`.
