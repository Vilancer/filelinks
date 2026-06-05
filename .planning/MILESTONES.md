# Milestones

## v1.1 AI agent integration (Shipped: 2026-05-31)

**Phases completed:** 3 phases, 10 plans, 20 tasks

**Key accomplishments:**

- **Agent run policy foundation (Phase 5):** global/per-link policy in schema, staged trigger/affect coverage classification, and policy gate (`trigger-only` / `trigger-or-affects`) for run eligibility.
- **Provider architecture + typed failures (Phase 6):** pluggable provider registry, merged `resolveAgentConfig`, and typed runtime errors for missing API key, startup failures, and run failures.
- **Cursor SDK integration (Phase 6):** local (`cwd`) and cloud (`repos`) runtime support with explicit config and safe disposal.
- **`check --run-agents` execution flow (Phase 7):** async orchestration that preserves violation behavior and exit codes while running eligible agent tasks afterward.
- **Prompt/context plumbing (Phase 7):** trigger-side staged diff + readable affected file content + resolved prompt settings included in agent prompts.
- **CLI/add wizard DX (Phase 7 follow-up):** model discovery + meaningful variant labels, debounced model search, optional global/per-link agent + prompt setup, and `.env` API key resolution.

**Archives:** [Roadmap](milestones/v1.1-ROADMAP.md) · [Requirements](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0 MVP (Shipped: 2026-04-06)

**Phases completed:** 4 phases, 7 plans, 18 tasks

**Key accomplishments:**

- **Core library (Phase 1):** `defineLinks`, jiti config load with walk-up, staged paths from git, `minimatch` link matching, `resolvePrompt` merge helper.
- **Repo DX (Phase 2):** Optional `linkType` on links; architecture/contributor docs; Husky + lint-staged; Cursor rules and `AGENTS.md`.
- **Effect + errors (Phase 3):** Effect Schema for public config shapes; typed `FilelinksError` hierarchy; `normalizeError` for CLI-ready structured failures.
- **CLI (Phase 4):** `filelinks check` / `list` / `add` (Commander); Ink + React for interactive `add`; optional `--config` via `loadFileLinksConfig(cwd, { configPath })`; `--json` for `check`/`list`; publishable `bin` and root README for `npx` demo.

**Archives:** [Roadmap](milestones/v1.0-ROADMAP.md) · [Requirements](milestones/v1.0-REQUIREMENTS.md)

---
