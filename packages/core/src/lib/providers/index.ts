import type { AgentProviderId } from '../schema';
import {
  getAgentProvider,
  listAgentProviderIds,
  registerAgentProvider,
  registerBuiltInProviders,
} from './registry';
import type {
  AgentModelOption,
  AgentProvider,
  AgentProviderContext,
  AgentRunInput,
  AgentRunResult,
} from './types';

export type {
  AgentModelOption,
  AgentProvider,
  AgentProviderContext,
  AgentRunInput,
  AgentRunResult,
};

export {
  getAgentProvider,
  listAgentProviderIds,
  registerAgentProvider,
  registerBuiltInProviders,
};

export async function listAgentModels(
  providerId: AgentProviderId,
  ctx?: AgentProviderContext,
): Promise<AgentModelOption[]> {
  return getAgentProvider(providerId).listModels(ctx ?? {});
}
