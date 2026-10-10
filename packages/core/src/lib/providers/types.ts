import type { ResolvedAgentConfig } from '../agentConfigResolver';
import type { AgentModelParameter, AgentProviderId } from '../schema';

export type AgentModelOption = {
  id: string;
  label?: string;
  params?: AgentModelParameter[];
  /** Unique selection key (includes variant params when present). */
  key: string;
};

export type AgentProviderContext = {
  /** Provider credential: Cursor API key, or Claude setup token / Anthropic API key. */
  apiKey?: string;
};

/**
 * `edit` lets the agent change files (`check --run-agents`); `suggest` is read-only and
 * returns suggestions as `resultText` (`filelinks suggest`).
 */
export type AgentRunMode = 'edit' | 'suggest';

export type AgentRunInput = {
  prompt: string;
  config: ResolvedAgentConfig;
  ctx?: AgentProviderContext;
  /** Defaults to `edit`. */
  mode?: AgentRunMode;
};

/** Successful run result. Failures throw `AgentRunFailedError` instead of returning an error status. */
export type AgentRunResult = {
  status: 'finished';
  runId: string;
  resultText?: string;
};

export interface AgentProvider {
  readonly id: AgentProviderId;

  /** Throws `AgentMissingApiKeyError` when the provider needs a credential that is missing. */
  validateCredentials(
    ctx: AgentProviderContext,
    config?: Pick<ResolvedAgentConfig, 'claude'>,
  ): void;

  listModels(ctx: AgentProviderContext): Promise<AgentModelOption[]>;

  run(input: AgentRunInput): Promise<AgentRunResult>;
}
