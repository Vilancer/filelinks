import type { StagedLinkCoverage } from './stagedClassifier';
import type { AgentRunPolicy, FileLinkConfig, FileLinkEntry } from './schema';

export function shouldRunAgentForLink(
  coverage: StagedLinkCoverage,
  policy: AgentRunPolicy,
): boolean {
  switch (policy) {
    case 'trigger-or-affects':
      return coverage.triggerMatched || coverage.affectMatched;
    default: {
      const _exhaustive: never = policy;
      return _exhaustive;
    }
  }
}

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
