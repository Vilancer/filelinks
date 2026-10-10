# @vilancer/filelinks

[![npm](https://img.shields.io/npm/v/@vilancer/filelinks)](https://www.npmjs.com/package/@vilancer/filelinks)
[![Cursor provider](https://img.shields.io/badge/Provider-Cursor-6D6DF6)](https://cursor.com)
[![Claude Code provider](https://img.shields.io/badge/Provider-Claude%20Code-D97757)](https://code.claude.com/docs/en/agent-sdk)

**filelinks** lets you declare which files belong together in a git repo ("when this route changes, the OpenAPI spec
must change too"), then checks every staged change against those links. Optionally, an AI agent (**Cursor** or
**Claude Code**) suggests or makes the companion updates for you.

This package is the **CLI** (binary: `filelinks`). Your `filelinks.config.ts` imports `defineLinks` from
[`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core), so install both.

- `filelinks check`: report staged triggers whose companions are not staged (exit 1 on `severity: 'error'`)
- `filelinks check --run-agents [--stage-fixes]`: let an agent update the companions, stage them, re-check
- `filelinks suggest`: ask the agent what to change, read-only
- `filelinks graph`: your links as a terminal tree, Graphviz DOT, Mermaid, HTML or JSON
- `filelinks list` / `filelinks add`: inspect links, or add one with an interactive wizard (creates the config)
- Pre-commit hook: [`@vilancer/filelinks-git-hook`](https://www.npmjs.com/package/@vilancer/filelinks-git-hook)

## Install

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
# or
npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

Requires **Node.js 20+** and **git** (filelinks reads the staged set with `git diff --cached`).

## Quick start

No config yet? The wizard creates `filelinks.config.ts` for you:

```bash
npx filelinks add
```

Or write it yourself at the repo root:

```typescript
// filelinks.config.ts
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks([
  {
    trigger: 'apps/api/src/routes/user.ts',
    affects: [
      { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
    ],
    severity: 'error',
  },
]);
```

```bash
git add apps/api/src/routes/user.ts
npx filelinks check
# [error] trigger=apps/api/src/routes/user.ts affected=apps/api/docs/openapi.yaml reason=Keep OpenAPI in sync
# (exit code 1)
```

## Commands

Global options (before the command): `--cwd <dir>` (config discovery and git; default: current directory),
`--config <path>` (skip the upward search for `filelinks.config.ts`), `--json` (machine-readable stdout),
`--verbose`, `-V, --version`.

### `filelinks check`

Compares staged files to your links and prints one line per missing companion.

| Flag                     | What it does                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `--run-agents`           | After the check, run the configured agent for every link whose run policy matches the staged set         |
| `--stage-fixes`          | With `--run-agents`: `git add` the missing companions the agents wrote during this run, then check again |
| `--cursor-api-key <key>` | Cursor API key for this run                                                                              |
| `--claude-token <token>` | Claude setup token or Anthropic API key for this run (`agent.claude.auth: 'token'`)                      |

- **Exit code**: `1` when a missing companion has `severity: 'error'` or an agent run failed, otherwise `0`
  (`warn` only prints).
- Agents edit files but never stage them. Without `--stage-fixes`, a fixed companion is listed as
  `[agent] updated <path> (not staged): git add <path>, or rerun with --stage-fixes`. With it, only companions the
  commit was missing, and only files the agents wrote during this run, are staged; your other unstaged edits stay
  unstaged.
- `--json`: `{ "violations": [{ trigger, affectedFile, reason, severity }], "agentRuns"?: [{ trigger, status, runId? }], "agentFixes"?: [{ path, staged }] }`.

```bash
filelinks check
filelinks check --run-agents --stage-fixes
filelinks --json check --run-agents
```

### `filelinks suggest`

Runs the agent on the same policy-eligible links as `check --run-agents`, but **read-only**: it gets the staged
trigger diff and the affected files and replies with what each companion needs (often a diff). Cursor runs in
`plan` mode; Claude Code gets Read/Glob/Grep only, with your settings hooks turned off.

```bash
filelinks suggest
filelinks --json suggest   # { "suggestions": [{ trigger, status, runId, suggestion }] }
```

Flags: `--cursor-api-key`, `--claude-token`. Exit `1` if an agent run fails.

### `filelinks graph`

```bash
filelinks graph                                   # terminal tree (colored on a TTY; NO_COLOR respected)
filelinks graph --staged                          # mark triggered links and ✓ satisfied / ✗ missing companions
filelinks graph --format dot | dot -Tsvg > links.svg
filelinks graph --format mermaid                  # paste into Markdown
filelinks graph --format html --output links.html # self-contained page: diagram + table
filelinks --json graph                            # { "graph": { nodes, edges, ... } }
```

`--format terminal|dot|mermaid|html` (default `terminal`), `--output <file>` (relative to `--cwd`), `--staged`.

### `filelinks list`

All declared links as a table (`--json`: `{ "rows": [...] }`).

### `filelinks add`

Interactive wizard (terminal UI): pick a trigger and the affected files from your repo, severity and `linkType`,
then optionally agent defaults and per-link overrides (provider, Claude auth, runtime, model picker with live model
lists) and prompt settings. Creates `filelinks.config.ts` when it doesn't exist, otherwise appends the link.
Interactive only (no `--json`).

## Config reference

`defineLinks(links, config?)` from `@vilancer/filelinks-core`:

| Link field |                                                                                        |
| ---------- | -------------------------------------------------------------------------------------- |
| `trigger`  | minimatch glob on repo-relative paths                                                  |
| `affects`  | `[{ file, reason }]`; `file` is a glob, or a directory for `file-dir` / `dir-dir`      |
| `linkType` | optional: `file-file`, `dir-dir`, `file-dir`, `dir-file`                               |
| `severity` | `warn` (default) or `error`                                                            |
| `prompt`   | optional: `systemPrompt`, `temperature`, `maxTokens` (merged over the global `prompt`) |
| `agent`    | optional per-link agent override (merged over the global `agent`)                      |

| `agent` field |                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------- |
| `provider`    | `cursor` or `claude`                                                                     |
| `runtime`     | `local` (+ `local.cwd`) or `cloud` (+ `cloud.repos`, Cursor only)                        |
| `model`       | defaults: `composer-2.5` (Cursor), `claude-opus-5-5` (Claude)                            |
| `modelParams` | `[{ id, value }]`, e.g. Cursor variants, or `{ id: 'effort', value: 'high' }` for Claude |
| `runPolicy`   | `trigger-only` (default) or `trigger-or-affects`                                         |
| `claude.auth` | `device` (default) or `token`                                                            |

## AI agents

### Claude Code (`provider: 'claude'`)

Runs Claude Code on your machine through the Claude Agent SDK (runtime `local` only).

```typescript
export default defineLinks(links, {
  agent: {
    provider: 'claude',
    runtime: 'local',
    local: { cwd: '.' },
    claude: { auth: 'device' },
  },
});
```

- **`auth: 'device'`** (default): uses the Claude Code login and settings already on the machine (run `claude` and
  `/login` once).
- **`auth: 'token'`**: uses a token from `claude setup-token` (or an Anthropic API key), resolved from
  `--claude-token`, then `CLAUDE_CODE_OAUTH_TOKEN`, then `ANTHROPIC_API_KEY` (environment, then `.env.local`, then
  `.env` under `--cwd`). Good for CI. Missing token → a clear error, no run.
- **Tools are fixed by filelinks**: edit runs get Read, Glob, Grep, Edit, Write; `suggest` gets Read, Glob, Grep.
  No shell, no web, no MCP servers, and nothing waits for a permission prompt.

### Cursor (`provider: 'cursor'`)

```bash
export CURSOR_API_KEY=...   # or --cursor-api-key, or CURSOR_API_KEY in .env.local / .env under --cwd
filelinks check --run-agents
```

Local runtime (`local.cwd`) or cloud runtime (`cloud.repos`: full URLs, or `org/repo` for GitHub).

## Git hook

```bash
pnpm add -D @vilancer/filelinks-git-hook
npx filelinks-git-hook install     # .git/hooks/pre-commit, or .husky/pre-commit with husky
FILELINKS_SKIP=1 git commit ...    # skip once
```

See [`@vilancer/filelinks-git-hook`](https://www.npmjs.com/package/@vilancer/filelinks-git-hook) for husky and
lint-staged setups.

## Packages

| Package                                                                                      | Role                                                              |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks) (this)            | CLI (`filelinks`)                                                 |
| [`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core)         | `defineLinks`, matching, git helpers, agent providers, link graph |
| [`@vilancer/filelinks-git-hook`](https://www.npmjs.com/package/@vilancer/filelinks-git-hook) | Pre-commit hook installer (`filelinks-git-hook`)                  |

Release notes: [v1.2.0](https://github.com/Vilancer/filelinks/blob/main/docs/releases/v1.2.0.md) ·
Source and issues: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks)
