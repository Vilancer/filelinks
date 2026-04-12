import {
  getStagedFilePaths,
  loadFileLinksConfig,
  matchStagedLinks,
  normalizeError,
} from '@filelinks/core';

import type { CheckViolationJson } from './formatters.js';
import { printCheckJson } from './formatters.js';

export type RunCheckOpts = {
  cwd: string;
  configPath?: string;
  json: boolean;
};

function effectiveSeverity(entry: {
  severity?: 'warn' | 'error';
}): 'warn' | 'error' {
  return entry.severity ?? 'warn';
}

export function runCheck(opts: RunCheckOpts): number {
  let links;
  try {
    const loaded = loadFileLinksConfig(
      opts.cwd,
      opts.configPath ? { configPath: opts.configPath } : undefined,
    );
    links = loaded.links;
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

  if (opts.json) {
    printCheckJson(violations);
  } else {
    for (const v of violations) {
      console.log(
        `[${v.severity}] trigger=${v.trigger} affected=${v.affectedFile} reason=${v.reason}`,
      );
    }
  }

  const hasError = violations.some((v) => v.severity === 'error');
  return hasError ? 1 : 0;
}
