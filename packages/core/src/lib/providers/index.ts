import type { AgentProviderId } from '../schema';
import { claudeAgentProvider } from './claudeProvider';
import { cursorAgentProvider } from './cursorProvider';
import {
  getAgentProvider,
  listAgentProviderIds,
  registerAgentProvider,
} from './registry';
import type {
  AgentModelOption,
  AgentProvider,
  AgentProviderContext,
  AgentRunInput,
  AgentRunMode,
  AgentRunResult,
} from './types';

export type {
  AgentModelOption,
  AgentProvider,
  AgentProviderContext,
  AgentRunInput,
  AgentRunMode,
  AgentRunResult,
};

export {
  ANTHROPIC_API_KEY_ENV_NAME,
  CLAUDE_OAUTH_TOKEN_ENV_NAME,
  claudeTokenFromEnv,
  createClaudeAgentProvider,
  type ClaudeAgentSdk,
} from './claudeProvider';

export {
  expandCursorModelOptions,
  modelOptionKey,
  parseModelOptionKey,
  sortAgentModelOptions,
} from './cursorModelOptions.js';

export { getAgentProvider, listAgentProviderIds, registerAgentProvider };

export async function listAgentModels(
  providerId: AgentProviderId,
  ctx?: AgentProviderContext,
): Promise<AgentModelOption[]> {
  return getAgentProvider(providerId).listModels(ctx ?? {});
}

export function registerBuiltInProviders(): void {
  registerAgentProvider(cursorAgentProvider);
  registerAgentProvider(claudeAgentProvider);
}

registerBuiltInProviders();
