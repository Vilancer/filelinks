import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  DEFAULT_HOOK_COMMAND,
  DEFAULT_HOOK_NAME,
  GIT_HOOK_SHEBANG,
  HUSKY_HOOK_SHEBANG,
  removeHookBlock,
  renderHookBlock,
  upsertHookBlock,
  type UpsertAction,
} from './hookBlock.js';

export type HookKind = 'husky' | 'git';

export interface HookTargetOptions {
  cwd?: string;
  /** Force `.husky/<hook>` even when `.husky/` does not exist yet. */
  husky?: boolean;
  hook?: string;
}

export interface HookTarget {
  kind: HookKind;
  /** Absolute path of the hook script. */
  path: string;
  /** Absolute git work-tree root. */
  root: string;
  hook: string;
}

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    const stderr =
      e && typeof e === 'object' && 'stderr' in e
        ? String((e as { stderr: unknown }).stderr).trim()
        : '';
    throw new Error(
      `git ${args.join(' ')} failed in ${cwd}${stderr ? `: ${stderr}` : ''}`,
    );
  }
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Where the hook script lives:
 * `--husky` or an existing `<root>/.husky/` → `<root>/.husky/<hook>`,
 * otherwise `git rev-parse --git-path hooks` (respects worktrees and `core.hooksPath`).
 */
export function resolveHookTarget(options: HookTargetOptions = {}): HookTarget {
  const cwd = resolve(options.cwd ?? process.cwd());
  const hook = options.hook ?? DEFAULT_HOOK_NAME;
  if (!hook || hook.includes('/') || hook.includes('\\')) {
    throw new Error(`Invalid hook name: ${JSON.stringify(hook)}`);
  }
  const root = resolve(cwd, git(cwd, ['rev-parse', '--show-toplevel']));
  const huskyDir = join(root, '.husky');
  if (options.husky || isDirectory(huskyDir)) {
    return { kind: 'husky', path: join(huskyDir, hook), root, hook };
  }
  const hooksDir = resolve(cwd, git(cwd, ['rev-parse', '--git-path', 'hooks']));
  return { kind: 'git', path: join(hooksDir, hook), root, hook };
}

export interface InstallHookOptions extends HookTargetOptions {
  /** Command run by the hook block (default `npx --no-install filelinks-git-hook run`). */
  command?: string;
}

export interface InstallHookResult extends HookTarget {
  action: UpsertAction;
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}

/** Idempotently write the filelinks block into the hook script and make it executable. */
export function installHook(
  options: InstallHookOptions = {},
): InstallHookResult {
  const target = resolveHookTarget(options);
  const block = renderHookBlock(options.command ?? DEFAULT_HOOK_COMMAND);
  const shebang =
    target.kind === 'husky' ? HUSKY_HOOK_SHEBANG : GIT_HOOK_SHEBANG;
  const { content, action } = upsertHookBlock(
    readIfExists(target.path),
    block,
    shebang,
  );
  mkdirSync(dirname(target.path), { recursive: true });
  if (action !== 'unchanged') {
    writeFileSync(target.path, content, 'utf8');
  }
  chmodSync(target.path, 0o755);
  return { ...target, action };
}

export type UninstallAction =
  | 'removed'
  | 'deleted'
  | 'not-installed'
  | 'missing';

export interface UninstallHookResult extends HookTarget {
  action: UninstallAction;
}

/** Remove the filelinks block; delete the script when only a shebang remains. */
export function uninstallHook(
  options: HookTargetOptions = {},
): UninstallHookResult {
  const target = resolveHookTarget(options);
  const existing = readIfExists(target.path);
  if (existing === undefined) {
    return { ...target, action: 'missing' };
  }
  const { content, removed } = removeHookBlock(existing);
  if (!removed) {
    return { ...target, action: 'not-installed' };
  }
  if (content === undefined) {
    rmSync(target.path, { force: true });
    return { ...target, action: 'deleted' };
  }
  writeFileSync(target.path, content, 'utf8');
  return { ...target, action: 'removed' };
}
