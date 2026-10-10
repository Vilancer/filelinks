export interface RunHookCheckOptions {
  cwd?: string;
  config?: string;
  runAgents?: boolean;
  /** With `runAgents`: stage the missing companions the agents wrote (`--stage-fixes`). */
  stageFixes?: boolean;
  json?: boolean;
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to `process.stderr.write`. */
  writeErr?: (text: string) => void;
}

/** argv passed to `runCli` from `@vilancer/filelinks` for a hook-triggered check. */
export function buildCheckArgv(options: RunHookCheckOptions = {}): string[] {
  const argv = ['node', 'filelinks'];
  if (options.cwd) {
    argv.push('--cwd', options.cwd);
  }
  if (options.config) {
    argv.push('--config', options.config);
  }
  if (options.json) {
    argv.push('--json');
  }
  argv.push('check');
  if (options.runAgents) {
    argv.push('--run-agents');
    if (options.stageFixes) {
      argv.push('--stage-fixes');
    }
  }
  return argv;
}

/**
 * Run `filelinks check` in-process. Returns the exit code (also left in `process.exitCode`).
 * `FILELINKS_SKIP=1` short-circuits with exit 0.
 */
export async function runHookCheck(
  options: RunHookCheckOptions = {},
): Promise<number> {
  const env = options.env ?? process.env;
  const writeErr =
    options.writeErr ?? ((text: string) => process.stderr.write(text));
  if (env['FILELINKS_SKIP'] === '1') {
    writeErr('filelinks: skipped (FILELINKS_SKIP=1)\n');
    process.exitCode = 0;
    return 0;
  }
  const { runCli } = await import('@vilancer/filelinks');
  process.exitCode = 0;
  await runCli(buildCheckArgv(options));
  const code = Number(process.exitCode ?? 0) || 0;
  process.exitCode = code;
  return code;
}
