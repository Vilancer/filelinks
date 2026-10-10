import type {
  ModelInfo,
  Options,
  SDKMessage,
  SDKResultMessage,
  SDKUserMessage,
  SettingSource,
  query as claudeQuery,
} from '@anthropic-ai/claude-agent-sdk';

import { DEFAULT_CLAUDE_AUTH } from '../agentProviderInfo';
import type { ResolvedAgentConfig } from '../agentConfigResolver';
import {
  AgentConfigError,
  AgentMissingApiKeyError,
  AgentRunFailedError,
  AgentStartupError,
  FilelinksError,
} from '../errors';
import type { AgentClaudeAuth } from '../schema';
import { modelOptionKey } from './cursorModelOptions.js';
import type {
  AgentModelOption,
  AgentProvider,
  AgentProviderContext,
  AgentRunInput,
  AgentRunMode,
  AgentRunResult,
} from './types';

export const CLAUDE_OAUTH_TOKEN_ENV_NAME = 'CLAUDE_CODE_OAUTH_TOKEN';
export const ANTHROPIC_API_KEY_ENV_NAME = 'ANTHROPIC_API_KEY';

const CLAUDE_TOKEN_MISSING_MESSAGE =
  'Claude token is required for agent.claude.auth "token" — run `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN (or ANTHROPIC_API_KEY), or use auth "device" to reuse the Claude Code login on this machine';

const CLAUDE_AUTH_HINT =
  'For auth "device" run `claude` and /login once on this machine; for auth "token" set CLAUDE_CODE_OAUTH_TOKEN from `claude setup-token`.';

const READ_ONLY_TOOLS: readonly string[] = ['Read', 'Glob', 'Grep'];
const EDIT_TOOLS: readonly string[] = [...READ_ONLY_TOOLS, 'Edit', 'Write'];

const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type EffortLevel = (typeof EFFORT_LEVELS)[number];

export type ClaudeAgentSdk = { query: typeof claudeQuery };

const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<unknown>;

/**
 * The SDK is ESM-only and core compiles to CommonJS, so resolve its entry with `require`
 * and load it through a real dynamic `import()` (tsc would otherwise rewrite it to `require`).
 */
export async function loadClaudeAgentSdk(): Promise<ClaudeAgentSdk> {
  const { pathToFileURL } = await import('node:url');
  const entry = require.resolve('@anthropic-ai/claude-agent-sdk');
  return (await importEsm(pathToFileURL(entry).href)) as ClaudeAgentSdk;
}

function resolveAuth(config: Pick<ResolvedAgentConfig, 'claude'>) {
  return config.claude?.auth ?? DEFAULT_CLAUDE_AUTH;
}

/** Claude credential from an explicit value, then CLAUDE_CODE_OAUTH_TOKEN, then ANTHROPIC_API_KEY. */
export function claudeTokenFromEnv(explicit?: string): string | undefined {
  return (
    explicit?.trim() ||
    process.env[CLAUDE_OAUTH_TOKEN_ENV_NAME]?.trim() ||
    process.env[ANTHROPIC_API_KEY_ENV_NAME]?.trim() ||
    undefined
  );
}

function resolveToken(ctx: AgentProviderContext): string {
  const token = claudeTokenFromEnv(ctx.apiKey);
  if (!token) {
    throw new AgentMissingApiKeyError(CLAUDE_TOKEN_MISSING_MESSAGE);
  }
  return token;
}

/** The process environment with exactly one Claude credential (an API key would win over an OAuth token). */
function envWithToken(token: string): NonNullable<Options['env']> {
  const env: NonNullable<Options['env']> = { ...process.env };
  delete env[ANTHROPIC_API_KEY_ENV_NAME];
  delete env[CLAUDE_OAUTH_TOKEN_ENV_NAME];
  if (token.startsWith('sk-ant-api')) {
    env[ANTHROPIC_API_KEY_ENV_NAME] = token;
  } else {
    env[CLAUDE_OAUTH_TOKEN_ENV_NAME] = token;
  }
  return env;
}

/**
 * `device`: inherit the environment so Claude Code resolves its own login and settings.
 * `token`: pass exactly one credential (an API key would otherwise win over the OAuth token).
 */
export function buildClaudeEnv(
  auth: AgentClaudeAuth,
  ctx: AgentProviderContext,
): Options['env'] {
  return auth === 'device' ? undefined : envWithToken(resolveToken(ctx));
}

function settingSourcesFor(auth: AgentClaudeAuth): SettingSource[] {
  return auth === 'device'
    ? ['user', 'project', 'local']
    : ['project', 'local'];
}

function resolveEffort(config: ResolvedAgentConfig): EffortLevel | undefined {
  const value = config.modelParams?.find((p) => p.id === 'effort')?.value;
  if (value === undefined) {
    return undefined;
  }
  if (!(EFFORT_LEVELS as readonly string[]).includes(value)) {
    throw new AgentConfigError(
      `agent.modelParams effort must be one of ${EFFORT_LEVELS.join(', ')} for provider claude`,
    );
  }
  return value as EffortLevel;
}

export function buildClaudeQueryOptions(
  config: ResolvedAgentConfig,
  ctx: AgentProviderContext,
  mode: AgentRunMode,
): Options {
  if (config.runtime !== 'local' || !config.local) {
    throw new AgentConfigError(
      'provider claude requires runtime "local" with agent.local.cwd',
    );
  }
  const auth = resolveAuth(config);
  const tools = [...(mode === 'suggest' ? READ_ONLY_TOOLS : EDIT_TOOLS)];
  const env = buildClaudeEnv(auth, ctx);
  const effort = resolveEffort(config);

  return {
    cwd: config.local.cwd,
    model: config.model,
    // Only these tools exist in the session, and only these run without a prompt.
    tools,
    allowedTools: tools,
    permissionMode: 'dontAsk',
    strictMcpConfig: true,
    settingSources: settingSourcesFor(auth),
    // Settings hooks run shell commands outside the tool list, so a read-only run turns them off.
    ...(mode === 'suggest' && { settings: { disableAllHooks: true } }),
    ...(env !== undefined && { env }),
    ...(effort !== undefined && { effort }),
  };
}

/** Streaming-input prompt that never sends a message; ends when `signal` aborts. */
function idlePrompt(signal: AbortSignal): AsyncIterable<SDKUserMessage> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () =>
        new Promise<IteratorResult<SDKUserMessage>>((resolve) =>
          signal.addEventListener(
            'abort',
            () => resolve({ done: true, value: undefined }),
            { once: true },
          ),
        ),
    }),
  };
}

export function toClaudeModelOptions(models: ModelInfo[]): AgentModelOption[] {
  return models.map((m) => ({
    id: m.value,
    label: m.displayName,
    key: modelOptionKey(m.value),
  }));
}

function toStartupError(error: unknown): AgentStartupError {
  const message =
    error instanceof Error ? error.message : 'Claude Code failed to start';
  return new AgentStartupError(`${message}. ${CLAUDE_AUTH_HINT}`, {
    cause: error,
  });
}

function toRunResult(result: SDKResultMessage): AgentRunResult {
  if (result.subtype !== 'success') {
    const detail =
      result.errors.length > 0 ? `: ${result.errors.join('; ')}` : '';
    throw new AgentRunFailedError(
      `Claude run ended with ${result.subtype}${detail}`,
      { runId: result.session_id },
    );
  }
  if (result.is_error) {
    throw new AgentRunFailedError(
      `Claude run failed: ${result.result || 'unknown error'}. ${CLAUDE_AUTH_HINT}`,
      { runId: result.session_id },
    );
  }
  return {
    status: 'finished',
    runId: result.session_id,
    resultText: result.result,
  };
}

export function createClaudeAgentProvider(
  deps: { loadSdk?: () => Promise<ClaudeAgentSdk> } = {},
): AgentProvider {
  const loadSdk = deps.loadSdk ?? loadClaudeAgentSdk;

  return {
    id: 'claude',

    validateCredentials(ctx, config) {
      if (config !== undefined && resolveAuth(config) === 'token') {
        resolveToken(ctx);
      }
    },

    async listModels(ctx) {
      // Token auth only when a token is available; otherwise ask the device login.
      const token = claudeTokenFromEnv(ctx.apiKey);
      const env = token === undefined ? undefined : envWithToken(token);
      const sdk = await loadSdk();
      const abort = new AbortController();
      const q = sdk.query({
        prompt: idlePrompt(abort.signal),
        options: {
          settingSources: [],
          ...(env !== undefined && { env }),
        },
      });
      try {
        return toClaudeModelOptions(await q.supportedModels());
      } catch (error) {
        throw toStartupError(error);
      } finally {
        abort.abort();
        q.close();
      }
    },

    async run(input: AgentRunInput): Promise<AgentRunResult> {
      const ctx = input.ctx ?? {};
      const options = buildClaudeQueryOptions(
        input.config,
        ctx,
        input.mode ?? 'edit',
      );

      let result: SDKResultMessage | undefined;
      try {
        const sdk = await loadSdk();
        const messages: AsyncIterable<SDKMessage> = sdk.query({
          prompt: input.prompt,
          options,
        });
        for await (const message of messages) {
          if (message.type === 'result') {
            result = message;
          }
        }
      } catch (error) {
        if (error instanceof FilelinksError) {
          throw error;
        }
        throw toStartupError(error);
      }

      if (result === undefined) {
        throw new AgentRunFailedError('Claude run ended without a result');
      }
      return toRunResult(result);
    },
  };
}

export const claudeAgentProvider = createClaudeAgentProvider();
