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
} from '@filelinks/core';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const CURSOR_API_KEY_ENV_NAME = 'CURSOR_API_KEY';
const CURSOR_API_KEY_MISSING_MESSAGE =
  'Cursor API key is required to run agents. Provide it via --cursor-api-key, CURSOR_API_KEY, or CURSOR_API_KEY in .env/.env.local at the --cwd repo root.';

function unwrapEnvValue(rawValue: string): string {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) {
    return value.trim();
  }
  return value.slice(0, hashIndex).trim();
}

function readCursorApiKeyFromEnvFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const text = readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^(?:export\s+)?CURSOR_API_KEY\s*=\s*(.*)$/u);
    if (!match) {
      continue;
    }

    const parsed = unwrapEnvValue(match[1] ?? '');
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return undefined;
}

function resolveCursorApiKey(opts: RunCheckOpts): string | undefined {
  const flagApiKey = opts.cursorApiKey?.trim();
  if (flagApiKey) {
    return flagApiKey;
  }

  const envApiKey = process.env[CURSOR_API_KEY_ENV_NAME]?.trim();
  if (envApiKey) {
    return envApiKey;
  }

  const envLocalApiKey = readCursorApiKeyFromEnvFile(
    join(opts.cwd, '.env.local'),
  );
  if (envLocalApiKey) {
    return envLocalApiKey;
  }

  return readCursorApiKeyFromEnvFile(join(opts.cwd, '.env'));
}

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
    const cursorApiKey = resolveCursorApiKey(opts);

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
          break;
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
