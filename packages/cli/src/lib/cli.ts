import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { normalizeError } from '@filelinks/core';
import { Command } from 'commander';

import { runAdd } from './runAdd';
import { runCheck } from './runCheck';
import { runList } from './runList';

function readVersion(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      const j = JSON.parse(readFileSync(candidate, 'utf8')) as {
        name?: string;
        version?: string;
        bin?: unknown;
      };
      /** Root workspace is also named `filelinks`; prefer the published CLI package (has `bin`). */
      if (j.name === 'filelinks' && j.version && j.bin !== undefined) {
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

export function runCli(argv: string[]): void {
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
    .action(function (this: Command) {
      try {
        const g = globalOpts(this);
        process.exitCode = runCheck({
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
    .command('add')
    .description('Interactively add a link to the config file')
    .action(async function (this: Command) {
      try {
        const g = globalOpts(this);
        process.exitCode = await runAdd({
          cwd: g.cwd,
          configPath: g.configPath,
          verbose: g.verbose,
        });
      } catch (e: unknown) {
        const h = normalizeError(e);
        console.error(h.message);
        process.exitCode = 1;
      }
    });

  try {
    program.parse(argv);
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    process.exitCode = 1;
  }
}
