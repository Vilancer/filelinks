import { Command } from 'commander';

import { DEFAULT_HOOK_NAME } from './hookBlock.js';
import { installHook, uninstallHook } from './hookTarget.js';
import { runHookCheck } from './runHookCheck.js';

const INSTALL_MESSAGES = {
  created: 'Created',
  appended: 'Appended filelinks block to',
  updated: 'Updated filelinks block in',
  unchanged: 'Already installed in',
} as const;

const UNINSTALL_MESSAGES = {
  removed: 'Removed filelinks block from',
  deleted: 'Removed filelinks block and deleted empty hook',
  'not-installed': 'No filelinks block found in',
  missing: 'Hook file does not exist:',
} as const;

function fail(e: unknown): void {
  console.error(
    `filelinks-git-hook: ${e instanceof Error ? e.message : String(e)}`,
  );
  process.exitCode = 1;
}

/** Entry for the `filelinks-git-hook` binary. */
export async function runGitHookCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name('filelinks-git-hook')
    .description('Install / run the filelinks check as a git hook');

  program
    .command('install')
    .description('Add the filelinks block to a git hook (plain git or husky)')
    .option(
      '--husky',
      'write to .husky/<hook> (auto-detected when .husky/ exists)',
    )
    .option('--hook <name>', 'hook name', DEFAULT_HOOK_NAME)
    .option('--command <cmd>', 'command the hook runs')
    .option('--cwd <dir>', 'directory inside the git repo', process.cwd())
    .action(
      (opts: {
        husky?: boolean;
        hook: string;
        command?: string;
        cwd: string;
      }) => {
        try {
          const r = installHook(opts);
          console.log(`${INSTALL_MESSAGES[r.action]} ${r.path} (${r.kind})`);
          process.exitCode = 0;
        } catch (e) {
          fail(e);
        }
      },
    );

  program
    .command('uninstall')
    .description('Remove the filelinks block from a git hook')
    .option('--husky', 'target .husky/<hook>')
    .option('--hook <name>', 'hook name', DEFAULT_HOOK_NAME)
    .option('--cwd <dir>', 'directory inside the git repo', process.cwd())
    .action((opts: { husky?: boolean; hook: string; cwd: string }) => {
      try {
        const r = uninstallHook(opts);
        console.log(`${UNINSTALL_MESSAGES[r.action]} ${r.path}`);
        process.exitCode = 0;
      } catch (e) {
        fail(e);
      }
    });

  program
    .command('run')
    .description('Run `filelinks check` (honours FILELINKS_SKIP=1)')
    .option('--cwd <dir>', 'working directory passed to filelinks')
    .option('--config <path>', 'path to config file')
    .option('--run-agents', 'run agents for policy-eligible links')
    .option('--json', 'machine-readable JSON on stdout')
    .action(
      async (opts: {
        cwd?: string;
        config?: string;
        runAgents?: boolean;
        json?: boolean;
      }) => {
        try {
          await runHookCheck(opts);
        } catch (e) {
          fail(e);
        }
      },
    );

  await program.parseAsync(argv);
}
