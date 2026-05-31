import type { AgentRunPolicy, FileLinkConfig, FileLinkEntry } from './schema';

export function resolveAgentRunPolicy(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry,
): AgentRunPolicy {
  return (
    link.agent?.runPolicy ??
    globalConfig.agent?.runPolicy ??
    'trigger-or-affects'
  );
}
