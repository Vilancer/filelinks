import {
  buildAgentPrompt,
  classifyStagedLinks,
  getAgentProvider,
  getStagedDiffForPaths,
  normalizeError,
  readAffectedContents,
  resolveAgentConfig,
  resolveAgentRunPolicy,
  resolvePrompt,
  shouldRunAgentForLink,
  type AgentProviderId,
  type AgentRunMode,
  type FileLinkConfig,
  type FileLinkEntry,
} from '@vilancer/filelinks-core';

import {
  CURSOR_API_KEY_MISSING_MESSAGE,
  resolveAgentCredential,
  type AgentCredentialFlags,
} from './agentCredentials.js';
import type { AgentRunSummaryJson } from './formatters.js';

export type RunEligibleAgentsOpts = {
  cwd: string;
  links: readonly FileLinkEntry[];
  config: FileLinkConfig;
  staged: string[];
  mode: AgentRunMode;
  /** When false, progress lines go to stderr. */
  json: boolean;
  credentials: AgentCredentialFlags;
};

/**
 * Run the configured provider for every policy-eligible link (shared by
 * `check --run-agents` and `suggest`). Returns one summary per eligible link.
 */
export async function runEligibleAgents(
  opts: RunEligibleAgentsOpts,
): Promise<{ runs: AgentRunSummaryJson[]; exitCode: number }> {
  const { config, cwd, mode } = opts;
  const eligible = classifyStagedLinks(opts.staged, [...opts.links]).filter(
    (cov) =>
      shouldRunAgentForLink(cov, resolveAgentRunPolicy(config, cov.entry)),
  );

  const runs: AgentRunSummaryJson[] = [];
  let exitCode = 0;
  // Same answer for every link of a provider: read the env and .env files once.
  const credentials = new Map<AgentProviderId, string | undefined>();
  const credentialFor = (provider: AgentProviderId) => {
    if (!credentials.has(provider)) {
      credentials.set(
        provider,
        resolveAgentCredential(provider, { cwd, ...opts.credentials }),
      );
    }
    return credentials.get(provider);
  };

  for (const cov of eligible) {
    const trigger = cov.entry.trigger;
    if (!opts.json) {
      console.error(`[agent] trigger=${trigger}`);
    }
    try {
      const agentConfig = resolveAgentConfig(config, cov.entry);
      const apiKey = credentialFor(agentConfig.provider);
      if (agentConfig.provider === 'cursor' && !apiKey) {
        console.error(CURSOR_API_KEY_MISSING_MESSAGE);
        runs.push({ trigger, status: 'error' });
        exitCode = 1;
        continue;
      }
      const provider = getAgentProvider(agentConfig.provider);
      const prompt = buildAgentPrompt({
        prompt: resolvePrompt(config, cov.entry),
        coverage: cov,
        triggerDiff: getStagedDiffForPaths(cwd, cov.triggerPaths),
        affectedFiles: readAffectedContents(cwd, [...cov.entry.affects]),
        mode,
      });
      const result = await provider.run({
        prompt,
        config: agentConfig,
        ctx: { apiKey },
        mode,
      });
      runs.push({
        trigger,
        status: 'ok',
        runId: result.runId,
        ...(mode === 'suggest' && { suggestion: result.resultText ?? '' }),
      });
    } catch (e: unknown) {
      console.error(normalizeError(e).message);
      runs.push({ trigger, status: 'error' });
      exitCode = 1;
    }
  }

  return { runs, exitCode };
}
