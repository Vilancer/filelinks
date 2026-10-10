import {
  getStagedFilePaths,
  loadFileLinksConfig,
  matchStagedLinks,
  normalizeError,
} from '@vilancer/filelinks-core';

import { runEligibleAgents } from './agentRunner.js';
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
  /** Optional Claude setup token / Anthropic API key override (auth "token"). */
  claudeToken?: string;
};

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

  let agentRuns: AgentRunSummaryJson[] = [];
  let agentExit = 0;

  if (opts.runAgents) {
    const result = await runEligibleAgents({
      cwd: opts.cwd,
      links,
      config,
      staged,
      mode: 'edit',
      json: opts.json,
      credentials: {
        cursorApiKey: opts.cursorApiKey,
        claudeToken: opts.claudeToken,
      },
    });
    agentRuns = result.runs;
    agentExit = result.exitCode;
  }

  if (opts.json) {
    printCheckJson(violations, opts.runAgents ? agentRuns : undefined);
  }

  if (!opts.runAgents) {
    return violationExit;
  }

  return Math.max(violationExit, agentExit);
}
