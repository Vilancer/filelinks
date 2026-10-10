import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeError } from '@vilancer/filelinks-core';
import { Command, Option } from 'commander';

import { runAdd } from './runAdd.js';
import { runCheck } from './runCheck.js';
import { GRAPH_FORMATS, runGraph } from './runGraph.js';
import { runList } from './runList.js';
import { runSuggest } from './runSuggest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve published CLI version from the nearest `@vilancer/filelinks` package.json. */
export function readVersion(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      const j = JSON.parse(readFileSync(candidate, 'utf8')) as {
        name?: string;
        version?: string;
        bin?: unknown;
      };
      /** Prefer the published CLI package (has `bin`); name is `@vilancer/filelinks`. */
      if (
        j.name === '@vilancer/filelinks' &&
        j.version &&
        j.bin !== undefined
      ) {
        return j.version;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return '0.0.0';
}

function globalOpts(cmd: Command): {
  cwd: string;
  configPath?: string;
  json: boolean;
  verbose: boolean;
} {
  const root = cmd.parent ?? cmd;
  const o = root.opts() as {
    cwd?: string;
    config?: string;
    json?: boolean;
    verbose?: boolean;
  };
  return {
    cwd: o.cwd ?? process.cwd(),
    configPath: o.config,
    json: Boolean(o.json),
    verbose: Boolean(o.verbose),
  };
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name('filelinks')
    .description('Declarative file relationship checks for your repo')
    .version(readVersion(), '-V, --version')
    .option(
      '--cwd <dir>',
      'working directory for config discovery and git',
      process.cwd(),
    )
    .option('--config <path>', 'path to config file (skip walk-up search)')
    .option('--json', 'machine-readable JSON on stdout', false)
    .option('--verbose', 'extra diagnostics', false);

  program
    .command('check')
    .description('Check staged files against declared links')
    .option('--run-agents', 'Run agents for policy-eligible links after check')
    .option(
      '--stage-fixes',
      'With --run-agents: git add the missing companions the agents wrote, then re-check',
    )
    .option(
      '--cursor-api-key <key>',
      'Cursor API key override for --run-agents',
    )
    .option(
      '--claude-token <token>',
      'Claude setup token / Anthropic API key override for --run-agents (agent.claude.auth "token")',
    )
    .action(async function (this: Command) {
      try {
        const g = globalOpts(this);
        const opts = this.opts() as {
          runAgents?: boolean;
          stageFixes?: boolean;
          cursorApiKey?: string;
          claudeToken?: string;
        };
        if (opts.stageFixes && !opts.runAgents) {
          console.error('--stage-fixes requires --run-agents');
          process.exitCode = 1;
          return;
        }
        process.exitCode = await runCheck({
          cwd: g.cwd,
          configPath: g.configPath,
          json: g.json,
          runAgents: Boolean(opts.runAgents),
          stageFixes: Boolean(opts.stageFixes),
          cursorApiKey: opts.cursorApiKey,
          claudeToken: opts.claudeToken,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  program
    .command('suggest')
    .description(
      'Ask the configured agent for read-only update suggestions on staged links (never edits files)',
    )
    .option('--cursor-api-key <key>', 'Cursor API key override')
    .option(
      '--claude-token <token>',
      'Claude setup token / Anthropic API key override (agent.claude.auth "token")',
    )
    .action(async function (this: Command) {
      try {
        const g = globalOpts(this);
        const opts = this.opts() as {
          cursorApiKey?: string;
          claudeToken?: string;
        };
        process.exitCode = await runSuggest({
          cwd: g.cwd,
          configPath: g.configPath,
          json: g.json,
          cursorApiKey: opts.cursorApiKey,
          claudeToken: opts.claudeToken,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  program
    .command('list')
    .description('List all declared links')
    .action(function (this: Command) {
      try {
        const g = globalOpts(this);
        process.exitCode = runList({
          cwd: g.cwd,
          configPath: g.configPath,
          json: g.json,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  program
    .command('graph')
    .description('Visualize declared links (terminal, DOT, Mermaid, HTML)')
    .addOption(
      new Option('--format <format>', 'output format')
        .choices([...GRAPH_FORMATS])
        .default('terminal'),
    )
    .option('--output <file>', 'write output to a file (relative to --cwd)')
    .option(
      '--staged',
      'overlay staged status (triggered / satisfied / missing)',
    )
    .action(function (this: Command) {
      try {
        const g = globalOpts(this);
        const o = this.opts() as {
          format: (typeof GRAPH_FORMATS)[number];
          output?: string;
          staged?: boolean;
        };
        process.exitCode = runGraph({
          cwd: g.cwd,
          configPath: g.configPath,
          json: g.json,
          format: o.format,
          output: o.output,
          staged: o.staged === true,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  program
    .command('add')
    .description(
      'Interactively add a link (creates filelinks.config.ts if missing)',
    )
    .action(async function (this: Command) {
      try {
        const g = globalOpts(this);
        process.exitCode = await runAdd({
          cwd: g.cwd,
          configPath: g.configPath,
          verbose: g.verbose,
          json: g.json,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  try {
    await program.parseAsync(argv);
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    process.exitCode = 1;
  }
}
