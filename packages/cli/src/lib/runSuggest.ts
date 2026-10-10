import {
  getStagedFilePaths,
  loadFileLinksConfig,
  normalizeError,
} from '@vilancer/filelinks-core';

import { runEligibleAgents } from './agentRunner.js';
import { printSuggestJson } from './formatters.js';

export type RunSuggestOpts = {
  cwd: string;
  configPath?: string;
  json: boolean;
  /** Optional Cursor API key override. */
  cursorApiKey?: string;
  /** Optional Claude setup token / Anthropic API key override (auth "token"). */
  claudeToken?: string;
};

/**
 * Read-only agent pass: for each policy-eligible link, ask the provider what the affected
 * files need and print the replies. Never edits files (Cursor `plan` mode, Claude read-only tools).
 */
export async function runSuggest(opts: RunSuggestOpts): Promise<number> {
  let loaded;
  let staged: string[];
  try {
    loaded = loadFileLinksConfig(
      opts.cwd,
      opts.configPath ? { configPath: opts.configPath } : undefined,
    );
    staged = getStagedFilePaths(opts.cwd);
  } catch (e: unknown) {
    console.error(normalizeError(e).message);
    return 1;
  }

  const { runs, exitCode } = await runEligibleAgents({
    cwd: opts.cwd,
    links: loaded.links,
    config: loaded.config,
    staged,
    mode: 'suggest',
    json: opts.json,
    credentials: {
      cursorApiKey: opts.cursorApiKey,
      claudeToken: opts.claudeToken,
    },
  });

  if (opts.json) {
    printSuggestJson(runs);
    return exitCode;
  }

  if (runs.length === 0) {
    console.log('No staged changes match a link eligible for suggestions.');
    return exitCode;
  }

  for (const run of runs) {
    if (run.status !== 'ok') {
      continue;
    }
    console.log(`## ${run.trigger}`);
    console.log('');
    console.log(run.suggestion?.trim() || '(no suggestions returned)');
    console.log('');
  }
  return exitCode;
}
