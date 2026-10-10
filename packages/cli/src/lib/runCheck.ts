import {
  changedSinceSnapshot,
  classifyStagedLinks,
  getStagedFilePaths,
  loadFileLinksConfig,
  matchStagedLinks,
  normalizeError,
  snapshotDirtyPaths,
  stagePaths,
  type FileLinkEntry,
} from '@vilancer/filelinks-core';

import { runEligibleAgents } from './agentRunner.js';
import type {
  AgentFixJson,
  AgentRunSummaryJson,
  CheckViolationJson,
} from './formatters.js';
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
  /**
   * After agents run, `git add` the missing companions they wrote during this run and
   * re-check, so a fixed commit exits 0. Without it, they are listed but left unstaged.
   */
  stageFixes?: boolean;
};

function effectiveSeverity(entry: {
  severity?: 'warn' | 'error';
}): 'warn' | 'error' {
  return entry.severity ?? 'warn';
}

/**
 * One row per missing companion of a staged trigger. `missing` holds each violated link
 * narrowed to its missing companions (what agent fixes may stage).
 */
function computeViolations(
  staged: string[],
  links: FileLinkEntry[],
): { violations: CheckViolationJson[]; missing: FileLinkEntry[] } {
  const violations: CheckViolationJson[] = [];
  const missing: FileLinkEntry[] = [];
  for (const { entry, missingAffected } of matchStagedLinks(staged, links)) {
    if (missingAffected.length > 0) {
      missing.push({ ...entry, affects: missingAffected });
    }
    for (const aff of missingAffected) {
      violations.push({
        trigger: entry.trigger,
        affectedFile: aff.file,
        reason: aff.reason,
        severity: effectiveSeverity(entry),
      });
    }
  }
  return { violations, missing };
}

function printViolations(violations: CheckViolationJson[]): void {
  for (const v of violations) {
    console.log(
      `[${v.severity}] trigger=${v.trigger} affected=${v.affectedFile} reason=${v.reason}`,
    );
  }
}

/** Best effort: fix detection is skipped (not fatal) when git status is unavailable. */
function trySnapshot(cwd: string): Map<string, string> | undefined {
  try {
    return snapshotDirtyPaths(cwd);
  } catch {
    return undefined;
  }
}

/** Missing companions that the agents wrote during this run (never already-staged ones). */
function detectAgentFixes(
  before: Map<string, string> | undefined,
  cwd: string,
  missing: FileLinkEntry[],
): string[] {
  if (before === undefined || missing.length === 0) {
    return [];
  }
  const after = trySnapshot(cwd);
  if (after === undefined) {
    return [];
  }
  const changed = changedSinceSnapshot(before, after);
  const fixes = classifyStagedLinks(changed, missing).flatMap(
    (row) => row.affectPaths,
  );
  return [...new Set(fixes)];
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

  const initial = computeViolations(staged, links);
  let violations = initial.violations;

  if (!opts.json) {
    printViolations(violations);
  }

  let agentRuns: AgentRunSummaryJson[] = [];
  let agentFixes: AgentFixJson[] = [];
  let agentExit = 0;

  if (opts.runAgents) {
    const before = trySnapshot(opts.cwd);
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

    const fixes = detectAgentFixes(before, opts.cwd, initial.missing);
    // Independent of agent failures: one link's agent may fail while another's fix stages fine.
    let fixesStaged = false;
    if (fixes.length > 0 && opts.stageFixes) {
      try {
        stagePaths(opts.cwd, fixes);
        fixesStaged = true;
        violations = computeViolations(
          getStagedFilePaths(opts.cwd),
          links,
        ).violations;
      } catch (e: unknown) {
        console.error(normalizeError(e).message);
        agentExit = 1;
      }
    }
    agentFixes = fixes.map((path) => ({ path, staged: fixesStaged }));

    if (!opts.json) {
      for (const fix of agentFixes) {
        console.error(
          fix.staged
            ? `[agent] staged ${fix.path}`
            : `[agent] updated ${fix.path} (not staged): git add ${fix.path}, or rerun with --stage-fixes`,
        );
      }
      if (opts.stageFixes && agentFixes.length > 0) {
        if (violations.length === 0) {
          console.log('[check] all companions are staged now');
        } else {
          console.log('[check] still missing after agent fixes:');
          printViolations(violations);
        }
      }
    }
  }

  const violationExit = violations.some((v) => v.severity === 'error') ? 1 : 0;

  if (opts.json) {
    printCheckJson(
      violations,
      opts.runAgents ? agentRuns : undefined,
      opts.runAgents ? agentFixes : undefined,
    );
  }

  if (!opts.runAgents) {
    return violationExit;
  }

  return Math.max(violationExit, agentExit);
}
