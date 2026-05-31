import type { ResolvedAgentConfig } from '../agentConfigResolver';
import type { AgentProviderId } from '../schema';

export type AgentModelOption = {
  id: string;
  label?: string;
};

export type AgentProviderContext = {
  apiKey?: string;
};

export type AgentRunInput = {
  prompt: string;
  config: ResolvedAgentConfig;
  ctx?: AgentProviderContext;
};

/** Successful run result. Failures throw `AgentRunFailedError` instead of returning an error status. */
export type AgentRunResult = {
  status: 'finished';
  runId: string;
  resultText?: string;
};

export interface AgentProvider {
  readonly id: AgentProviderId;

  validateCredentials(ctx: AgentProviderContext): void;

  listModels(ctx: AgentProviderContext): Promise<AgentModelOption[]>;

  run(input: AgentRunInput): Promise<AgentRunResult>;
}
