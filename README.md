# filelinks

[![Cursor provider](https://img.shields.io/badge/Provider-Cursor-6D6DF6)](https://cursor.com)
[![npm CLI](https://img.shields.io/npm/v/@vilancer/filelinks?label=%40vilancer%2Ffilelinks)](https://www.npmjs.com/package/@vilancer/filelinks)
[![npm core](https://img.shields.io/npm/v/@vilancer/filelinks-core?label=%40vilancer%2Ffilelinks-core)](https://www.npmjs.com/package/@vilancer/filelinks-core)

Declare semantic relationships between files — then **check staged git changes**, and optionally run **Cursor AI agents** to update the linked companions (`filelinks check --run-agents`).

**Packages:** [`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks) (CLI) · [`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core) (`defineLinks` + agent helpers)

## v1.1 release highlights

- Cursor-backed agent runs from `filelinks check --run-agents`
- Agent run policies (`trigger-only`, `trigger-or-affects`)
- Provider/runtime config (`local` + `cwd`, `cloud` + `repos`)
- Interactive `filelinks add` wizard for agent/prompt/model setup with searchable model variants

Release notes: [`docs/releases/v1.1.0.md`](docs/releases/v1.1.0.md)

## Install

Install the **[`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks)** CLI (bin: **`filelinks`**) and **[`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core)** (your `filelinks.config.ts` imports `defineLinks` from it; Node resolves that import from **your** app’s `node_modules`, not from inside the CLI).

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
```

```bash
npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

## Config

Create **`filelinks.config.ts`** at the repo root (or use **`--config`** to point to another path):

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

## Commands

Global options: **`--cwd <dir>`** (default: current directory), **`--config <path>`**, **`--json`**, **`--verbose`**.

### `filelinks check`

Compare **staged** files to your links; print violations; exit **1** if any missing companion has **`severity: 'error'`**.

```bash
filelinks check
filelinks check --json
filelinks check --cwd /path/to/repo --config ./my/filelinks.config.ts
```

#### AI agents with Cursor (`--run-agents`)

**`filelinks check --run-agents`** is opt-in: after the usual staged **check**, filelinks invokes **Cursor AI agents** for links that match the agent run policy — so companions (docs, OpenAPI, READMEs, etc.) can be updated when related code is staged.

**When agents run:** default policy is **`trigger-only`** unless overridden globally or per-link. A link is eligible when policy conditions match staged coverage. With **`trigger-or-affects`**, a link runs when either trigger-side or affect-side paths are staged. **Missing companion files on disk do not block** an agent run — violations are reported separately; agents still run when policy allows.

**Authentication precedence for Cursor provider:**

1. `--cursor-api-key` (check command)
2. `CURSOR_API_KEY` in environment
3. `CURSOR_API_KEY` in `.env.local` under `--cwd`
4. `CURSOR_API_KEY` in `.env` under `--cwd`

**Machine-readable output:** with **`--json --run-agents`**, the JSON payload includes an optional **`agentRuns`** array (per-link summaries) after agent execution. If the Cursor API key is missing, every policy-eligible link still gets an **`agentRuns`** entry with **`status: 'error'`** (not only the first link).

**Prompt `temperature` / `maxTokens` (v1.1):** These optional fields are merged into config like other `prompt` settings, but they are **not** passed to Cursor **`Agent.create`** in v1.1. They appear as metadata lines in the assembled agent prompt text only. Use them as hints for the agent in the prompt until a future release wires SDK generation options (if supported).

**Cloud `agent.cloud.repos` (v1.1):** Entries may be full repository URLs (`https://…` or `http://…`), which are passed through unchanged. Bare **`org/repo`** strings are treated as **GitHub shorthand** and expanded to `https://github.com/org/repo`. For GitLab, Bitbucket, or self-hosted hosts, use a full URL.

Examples:

```bash
filelinks check --run-agents
filelinks check --run-agents --cursor-api-key "$CURSOR_API_KEY"
filelinks check --json --run-agents
```

Example config (global defaults + per-link override):

```typescript
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      agent: {
        runPolicy: 'trigger-or-affects',
        provider: 'cursor',
        runtime: 'local',
        model: 'composer-2.5',
        modelParams: [{ id: 'fast', value: 'true' }],
        local: { cwd: '/path/to/your/repo' },
      },
    },
    {
      trigger: 'packages/web/**',
      affects: [{ file: 'packages/web/README.md', reason: 'Update docs' }],
      agent: {
        provider: 'cursor',
        runtime: 'cloud',
        model: 'composer-2.5',
        cloud: { repos: ['org/your-repo'] },
      },
    },
  ],
  {
    agent: {
      runPolicy: 'trigger-only',
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
      local: { cwd: '.' },
    },
  },
);
```

For contributor smoke tests, CI notes, and the linked-consumer workflow, see **`CONTRIBUTING.md`** → **AI agents (v1.1)**.

### `filelinks list`

Print all declared links (table, or **`--json`**).

```bash
filelinks list
filelinks list --json
```

### `filelinks add`

Interactive terminal UI (**Ink** + **React**): enter a **trigger** glob, **filter and pick** affected file paths from the repo (no need to type full paths), choose **severity** and optional **linkType**, then optionally configure **agent defaults** (`config.agent`) and a **per-link override** (`entry.agent`) with runtime selection (**local** `cwd` or **cloud** `repos`). The wizard also supports model selection (live provider `listModels` when available, with fallback options), meaningful variant labels (for example `default`, `Standard`, `Fast`), and debounced input search for large model catalogs. You can also set optional global/per-link prompt config (`systemPrompt`, `temperature`, `maxTokens`).

**Bootstraps the config:** if `filelinks.config.ts` is missing, **`add` creates it** with the first link (there is no separate `init` command). If the file already exists, it appends the new link (full-file rewrite). Does **not** support **`--json`** (use `check` / `list` for machine-readable output).

```bash
filelinks add
```

## Local development (this repo)

From the monorepo root, build **core** first (the CLI depends on it), then the CLI:

```bash
pnpm exec nx run core:build
pnpm exec nx run cli:build
node packages/cli/dist/src/index.js --version
node packages/cli/dist/src/index.js list --cwd packages/core/src/lib/__fixtures__/sample-filelinks-config
```

Run tests: **`pnpm test`** (see **`CONTRIBUTING.md`**). The published CLI package is **ESM** (`"type": "module"`). If you use **`pnpm link filelinks`** (or a **`file:`** CLI) in another repo, install **`@vilancer/filelinks-core`** in that repo too — see **Trying the CLI in another directory** in **`CONTRIBUTING.md`** for **`file:`** examples and link steps.
