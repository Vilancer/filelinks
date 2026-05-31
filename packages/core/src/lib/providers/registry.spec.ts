import { describe, expect, it, vi } from 'vitest';

import { AgentProviderUnknownError } from '../errors';
import type { AgentProviderId } from '../schema';
import type { AgentProvider } from './types';

function mockProvider(id: AgentProviderId): AgentProvider {
  return {
    id,
    validateCredentials: () => undefined,
    listModels: async () => [{ id: 'test-model' }],
    run: async () => ({ status: 'finished', runId: 'run-1' }),
  };
}

async function freshRegistry() {
  vi.resetModules();
  return import('./registry');
}

describe('agent provider registry', () => {
  it('throws AgentProviderUnknownError for unknown id', async () => {
    const { getAgentProvider } = await freshRegistry();
    let thrown: unknown;
    try {
      getAgentProvider('cursor');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeDefined();
    expect((thrown as AgentProviderUnknownError).code).toBe(
      'AGENT_PROVIDER_UNKNOWN',
    );
    expect((thrown as Error).message).toContain('cursor');
  });

  it('returns a registered provider by id', async () => {
    const { getAgentProvider, registerAgentProvider } = await freshRegistry();
    const provider = mockProvider('cursor');
    registerAgentProvider(provider);
    expect(getAgentProvider('cursor')).toBe(provider);
  });
});
