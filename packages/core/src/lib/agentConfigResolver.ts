import { AgentConfigError } from './errors';
import type {
  AgentCloudSettings,
  AgentLocalSettings,
  AgentModelParameter,
  AgentProviderId,
  AgentRunPolicy,
  AgentRuntime,
  AgentSettings,
  FileLinkConfig,
  FileLinkEntry,
} from './schema';

export type ResolvedAgentConfig = {
  provider: AgentProviderId;
  runtime: AgentRuntime;
  model: string;
  modelParams?: AgentModelParameter[];
  runPolicy?: AgentRunPolicy;
  local?: AgentLocalSettings;
  cloud?: AgentCloudSettings;
};

export function resolveAgentConfig(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry,
): ResolvedAgentConfig {
  const merged: AgentSettings = {
    ...(globalConfig.agent ?? {}),
    ...(link.agent ?? {}),
  };
  return validateResolvedAgentConfig(merged);
}

export function validateResolvedAgentConfig(
  merged: AgentSettings,
): ResolvedAgentConfig {
  if (!merged.provider) {
    throw new AgentConfigError('agent.provider is required');
  }
  if (!merged.runtime) {
    throw new AgentConfigError('agent.runtime is required');
  }
  if (merged.runtime === 'local') {
    const cwd = merged.local?.cwd?.trim();
    if (!cwd) {
      throw new AgentConfigError(
        'agent.local.cwd is required when runtime is local',
      );
    }
  }
  if (merged.runtime === 'cloud') {
    const repos = merged.cloud?.repos;
    if (!repos?.length) {
      throw new AgentConfigError(
        'agent.cloud.repos is required when runtime is cloud',
      );
    }
  }

  let model = merged.model;
  if (!model && merged.provider === 'cursor') {
    model = 'composer-2.5';
  }
  if (!model) {
    throw new AgentConfigError('agent.model is required');
  }

  return {
    provider: merged.provider,
    runtime: merged.runtime,
    model,
    ...(merged.modelParams !== undefined &&
      merged.modelParams.length > 0 && {
        modelParams: [...merged.modelParams],
      }),
    ...(merged.runPolicy !== undefined && { runPolicy: merged.runPolicy }),
    ...(merged.runtime === 'local' &&
      merged.local !== undefined && { local: merged.local }),
    ...(merged.runtime === 'cloud' &&
      merged.cloud !== undefined && { cloud: merged.cloud }),
  };
}
