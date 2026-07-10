import {
  buildAgentPrompt,
  classifyStagedLinks,
  getAgentProvider,
  getStagedDiffForPaths,
  getStagedFilePaths,
  loadFileLinksConfig,
  matchStagedLinks,
  normalizeError,
  readAffectedContents,
  resolveAgentConfig,
  resolveAgentRunPolicy,
  resolvePrompt,
  shouldRunAgentForLink,
} from '@vilancer/filelinks-core';
import { resolveCursorApiKey } from './cursorApiKey.js';

import type { AgentRunSummaryJson, CheckViolationJson } from './formatters.js';
import { printCheckJson } from './formatters.js';

export type RunCheckOpts = {
  cwd: string;
  configPath?: string;
  json: boolean;
  /** When true, run agents after violation reporting (default false). */
  runAgents?: boolean;
  /** Optional Cursor API key override for agent runs. */
  cursorApiKey?: string;
};

const CURSOR_API_KEY_MISSING_MESSAGE =
  'Cursor API key is required to run agents. Provide it via --cursor-api-key, CURSOR_API_KEY, or CURSOR_API_KEY in .env/.env.local at the --cwd repo root.';

function effectiveSeverity(entry: {
  severity?: 'warn' | 'error';
}): 'warn' | 'error' {
  return entry.severity ?? 'warn';
}

export async function runCheck(opts: RunCheckOpts): Promise<number> {
  let links;
  let config;
  try {
    const loaded = loadFileLinksConfig(
      opts.cwd,
      opts.configPath ? { configPath: opts.configPath } : undefined,
    );
    links = loaded.links;
    config = loaded.config;
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }

  let staged: string[];
  try {
    staged = getStagedFilePaths(opts.cwd);
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }

  const matches = matchStagedLinks(staged, links);
  const violations: CheckViolationJson[] = [];

  for (const { entry, missingAffected } of matches) {
    for (const aff of missingAffected) {
      const sev = effectiveSeverity(entry);
      violations.push({
        trigger: entry.trigger,
        affectedFile: aff.file,
        reason: aff.reason,
        severity: sev,
      });
    }
  }

  const violationExit = violations.some((v) => v.severity === 'error') ? 1 : 0;

  if (!opts.json) {
    for (const v of violations) {
      console.log(
        `[${v.severity}] trigger=${v.trigger} affected=${v.affectedFile} reason=${v.reason}`,
      );
    }
  }

  const agentRuns: AgentRunSummaryJson[] = [];
  let agentExit = 0;

  if (opts.runAgents) {
    const coverageRows = classifyStagedLinks(staged, links);
    const eligible = coverageRows.filter((cov) => {
      const policy = resolveAgentRunPolicy(config, cov.entry);
      return shouldRunAgentForLink(cov, policy);
    });
    const cursorApiKey = resolveCursorApiKey({
      cwd: opts.cwd,
      cursorApiKey: opts.cursorApiKey,
    });

    for (const cov of eligible) {
      if (!opts.json) {
        console.error(`[agent] trigger=${cov.entry.trigger}`);
      }
      try {
        const agentConfig = resolveAgentConfig(config, cov.entry);
        if (agentConfig.provider === 'cursor' && !cursorApiKey) {
          console.error(CURSOR_API_KEY_MISSING_MESSAGE);
          agentRuns.push({
            trigger: cov.entry.trigger,
            status: 'error',
          });
          agentExit = 1;
          continue;
        }
        const provider = getAgentProvider(agentConfig.provider);
        const prompt = buildAgentPrompt({
          prompt: resolvePrompt(config, cov.entry),
          coverage: cov,
          triggerDiff: getStagedDiffForPaths(opts.cwd, cov.triggerPaths),
          affectedFiles: readAffectedContents(opts.cwd, [...cov.entry.affects]),
        });
        const result = await provider.run({
          prompt,
          config: agentConfig,
          ctx: { apiKey: cursorApiKey },
        });
        agentRuns.push({
          trigger: cov.entry.trigger,
          status: 'ok',
          runId: result.runId,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        agentRuns.push({
          trigger: cov.entry.trigger,
          status: 'error',
        });
        agentExit = 1;
      }
    }
  }

  if (opts.json) {
    printCheckJson(violations, opts.runAgents ? agentRuns : undefined);
  }

  if (!opts.runAgents) {
    return violationExit;
  }

  return Math.max(violationExit, agentExit);
}
