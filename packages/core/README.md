# @vilancer/filelinks-core

[![npm](https://img.shields.io/npm/v/@vilancer/filelinks-core)](https://www.npmjs.com/package/@vilancer/filelinks-core)

The library behind **[filelinks](https://www.npmjs.com/package/@vilancer/filelinks)**: declare which files belong
together in a git repo, check them against **staged** changes, and let an AI agent (**Cursor** or **Claude Code**)
suggest or make the companion updates.

Most projects only use `defineLinks` from this package, in `filelinks.config.ts`; the CLI
([`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks), binary `filelinks`) does the rest.

## Install

Your config lives in **your** project and must resolve `@vilancer/filelinks-core`, so install it next to the CLI:

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core
# or
npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core
```

Requires **Node.js 20+**.

## Config

```typescript
// filelinks.config.ts
import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks(
  [
    {
      trigger: 'apps/api/src/routes/user.ts',
      affects: [
        { file: 'apps/api/docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
      ],
      severity: 'error',
    },
    {
      trigger: 'packages/web/**',
      affects: [{ file: 'packages/web/README.md', reason: 'Update docs' }],
      // per-link agent override: Cursor in the cloud for this one
      agent: {
        provider: 'cursor',
        runtime: 'cloud',
        cloud: { repos: ['org/your-repo'] },
      },
    },
  ],
  {
    // global defaults
    agent: {
      provider: 'claude',
      runtime: 'local',
      local: { cwd: '.' },
      runPolicy: 'trigger-or-affects',
      claude: { auth: 'device' }, // or 'token' (claude setup-token / ANTHROPIC_API_KEY)
    },
    prompt: { systemPrompt: 'Keep docs short and match the existing style.' },
  },
);
```

`defineLinks` validates everything with Effect Schema when the config loads; a typo in a field or value fails with a
clear message. Field reference: the [CLI README](https://www.npmjs.com/package/@vilancer/filelinks#config-reference).

```bash
npx filelinks check                          # missing companions for the staged set
npx filelinks suggest                        # read-only agent suggestions
npx filelinks check --run-agents --stage-fixes
npx filelinks graph --staged
```

## API

Everything below is exported from the package root.

| Area       | Exports                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config     | `defineLinks`, `loadFileLinksConfig`, `findConfigFile`, schemas (`FileLinkEntrySchema`, `FileLinkConfigSchema`, `AgentSettingsSchema`, …) and their types (`FileLinkEntry`, `FileLinkConfig`, `AgentSettings`, …)                           |
| Matching   | `matchStagedLinks`, `classifyStagedLinks`, `stagedCoversAffected`, `LINK_TYPES`, `LINK_TYPE_DESCRIPTIONS`, `isLinkType`, `linkTypeForPathKinds`, `isGlobPattern`                                                                            |
| Git        | `getGitRepoRoot`, `getStagedFilePaths`, `getStagedDiffForPaths`, `snapshotDirtyPaths`, `changedSinceSnapshot`, `stagePaths`                                                                                                                 |
| Link graph | `buildLinkGraph(links, { staged? })` → `{ nodes, edges }` (the model behind `filelinks graph`)                                                                                                                                              |
| Agents     | `resolveAgentConfig`, `resolveAgentRunPolicy`, `shouldRunAgentForLink`, `resolvePrompt`, `buildAgentPrompt`, `readAffectedContents`, `SUGGEST_INSTRUCTIONS`                                                                                 |
| Providers  | `getAgentProvider`, `registerAgentProvider`, `listAgentProviderIds`, `listAgentModels`, `createClaudeAgentProvider`, `claudeTokenFromEnv`, `AGENT_PROVIDER_IDS`, `AGENT_PROVIDER_DESCRIPTIONS`, `DEFAULT_AGENT_MODELS`, `CLAUDE_AUTH_MODES` |
| Errors     | `FilelinksError` (stable `code`), `ConfigNotFoundError`, `ConfigValidationError`, `AgentConfigError`, `AgentMissingApiKeyError`, `AgentStartupError`, `AgentRunFailedError`, `normalizeError`                                               |

### Providers

An `AgentProvider` has `validateCredentials`, `listModels` and `run({ prompt, config, ctx, mode })`, where `mode`
is `edit` (may change files) or `suggest` (read-only, returns `resultText`).

- **`cursor`**: `@cursor/sdk`, `CURSOR_API_KEY`, local or cloud runtime. `suggest` runs in Cursor's `plan` mode.
- **`claude`**: `@anthropic-ai/claude-agent-sdk`, local runtime. `claude.auth: 'device'` reuses the Claude Code
  login on the machine; `'token'` takes `ctx.apiKey`, then `CLAUDE_CODE_OAUTH_TOKEN`, then `ANTHROPIC_API_KEY`.
  Tools are fixed (Read/Glob/Grep, plus Edit/Write for `edit`), no permission prompts, no MCP servers, and settings
  hooks are off in `suggest`.

```typescript
import { getAgentProvider, resolveAgentConfig } from '@vilancer/filelinks-core';

const config = resolveAgentConfig(globalConfig, link); // merged global + per-link agent settings
const result = await getAgentProvider(config.provider).run({
  prompt,
  config,
  mode: 'suggest',
});
console.log(result.resultText);
```

## Packages

| Package                                                                                      | Role                                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@vilancer/filelinks`](https://www.npmjs.com/package/@vilancer/filelinks)                   | CLI (`filelinks`): `check`, `suggest`, `graph`, `list`, `add` |
| [`@vilancer/filelinks-core`](https://www.npmjs.com/package/@vilancer/filelinks-core) (this)  | Library API                                                   |
| [`@vilancer/filelinks-git-hook`](https://www.npmjs.com/package/@vilancer/filelinks-git-hook) | Pre-commit hook installer                                     |

Release notes: [docs/releases](https://github.com/Vilancer/filelinks/tree/main/docs/releases) ·
Source and issues: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks)
