import type { AgentProviderId } from '../schema';
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
}

registerBuiltInProviders();
