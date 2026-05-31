import { AgentProviderUnknownError } from '../errors';
import type { AgentProviderId } from '../schema';
import type { AgentProvider } from './types';

const providers = new Map<AgentProviderId, AgentProvider>();

export function registerAgentProvider(provider: AgentProvider): void {
  providers.set(provider.id, provider);
}

export function getAgentProvider(id: AgentProviderId): AgentProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new AgentProviderUnknownError(id);
  }
  return provider;
}

export function listAgentProviderIds(): AgentProviderId[] {
  return [...providers.keys()];
}

/** No-op until plan 03 registers the Cursor provider. */
export function registerBuiltInProviders(): void {
  // stub — cursor provider registered in 06-03
}
