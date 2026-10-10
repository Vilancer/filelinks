import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HOOK_BLOCK_START, renderHookBlock } from './hookBlock.js';
import { installHook, resolveHookTarget, uninstallHook } from './hookTarget.js';

function isExecutable(path: string): boolean {
  return (statSync(path).mode & 0o111) === 0o111;
}

describe('git hook install/uninstall (temp git repo)', () => {
  let repo: string;

  beforeEach(() => {
    repo = realpathSync(mkdtempSync(join(tmpdir(), 'filelinks-git-hook-')));
    execFileSync('git', ['init', '-q'], { cwd: repo });
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('resolves .git/hooks/pre-commit by default, also from a subdirectory', () => {
    mkdirSync(join(repo, 'apps', 'api'), { recursive: true });
    const t = resolveHookTarget({ cwd: join(repo, 'apps', 'api') });
    expect(t).toEqual({
      kind: 'git',
      path: join(repo, '.git', 'hooks', 'pre-commit'),
      root: repo,
      hook: 'pre-commit',
    });
  });

  it('respects core.hooksPath', () => {
    execFileSync('git', ['config', 'core.hooksPath', 'githooks'], {
      cwd: repo,
    });
    expect(resolveHookTarget({ cwd: repo }).path).toBe(
      join(repo, 'githooks', 'pre-commit'),
    );
  });

  it('rejects hook names with path separators', () => {
    expect(() => resolveHookTarget({ cwd: repo, hook: '../x' })).toThrow(
      /Invalid hook name/,
    );
  });

  it('throws outside a git repo', () => {
    const plain = mkdtempSync(join(tmpdir(), 'filelinks-no-git-'));
    try {
      expect(() => resolveHookTarget({ cwd: plain })).toThrow(/git rev-parse/);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });

  it('installs into .git/hooks with #!/bin/sh, executable, idempotently', () => {
    const first = installHook({ cwd: repo });
    const path = join(repo, '.git', 'hooks', 'pre-commit');
    expect(first).toMatchObject({ kind: 'git', path, action: 'created' });
    const content = readFileSync(path, 'utf8');
    expect(content).toBe(`#!/bin/sh\n\n${renderHookBlock()}\n`);
    expect(isExecutable(path)).toBe(true);

    expect(installHook({ cwd: repo }).action).toBe('unchanged');
    expect(readFileSync(path, 'utf8')).toBe(content);
  });

  it('appends to an existing non-executable hook and makes it executable', () => {
    const path = join(repo, '.git', 'hooks', 'pre-commit');
    mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
    writeFileSync(path, '#!/bin/sh\necho mine\n', { mode: 0o644 });

    expect(installHook({ cwd: repo, command: 'custom-check' }).action).toBe(
      'appended',
    );
    const content = readFileSync(path, 'utf8');
    expect(content.startsWith('#!/bin/sh\necho mine\n')).toBe(true);
    expect(content).toContain('  custom-check || exit $?');
    expect(isExecutable(path)).toBe(true);

    expect(installHook({ cwd: repo }).action).toBe('updated');
    expect(readFileSync(path, 'utf8')).not.toContain('custom-check');

    expect(uninstallHook({ cwd: repo }).action).toBe('removed');
    expect(readFileSync(path, 'utf8')).toBe('#!/bin/sh\necho mine\n');
  });

  it('uninstall deletes a hook file that only had the filelinks block', () => {
    installHook({ cwd: repo, hook: 'pre-push' });
    const path = join(repo, '.git', 'hooks', 'pre-push');
    expect(uninstallHook({ cwd: repo, hook: 'pre-push' })).toMatchObject({
      path,
      action: 'deleted',
    });
    expect(existsSync(path)).toBe(false);
    expect(uninstallHook({ cwd: repo, hook: 'pre-push' }).action).toBe(
      'missing',
    );
  });

  it('uninstall reports not-installed when the block is absent', () => {
    const path = join(repo, '.git', 'hooks', 'pre-commit');
    mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
    writeFileSync(path, '#!/bin/sh\necho mine\n');
    expect(uninstallHook({ cwd: repo }).action).toBe('not-installed');
    expect(readFileSync(path, 'utf8')).toBe('#!/bin/sh\necho mine\n');
  });

  it('auto-detects an existing .husky/ directory', () => {
    mkdirSync(join(repo, '.husky'));
    writeFileSync(join(repo, '.husky', 'pre-commit'), 'npx lint-staged\n');
    const r = installHook({ cwd: repo });
    const path = join(repo, '.husky', 'pre-commit');
    expect(r).toMatchObject({ kind: 'husky', path, action: 'appended' });
    expect(readFileSync(path, 'utf8')).toBe(
      `npx lint-staged\n\n${renderHookBlock()}\n`,
    );
    expect(isExecutable(path)).toBe(true);
    expect(existsSync(join(repo, '.git', 'hooks', 'pre-commit'))).toBe(false);

    expect(uninstallHook({ cwd: repo }).action).toBe('removed');
    expect(readFileSync(path, 'utf8')).toBe('npx lint-staged\n');
  });

  it('--husky creates .husky/<hook> with an sh shebang', () => {
    const r = installHook({ cwd: repo, husky: true });
    const path = join(repo, '.husky', 'pre-commit');
    expect(r).toMatchObject({ kind: 'husky', path, action: 'created' });
    const content = readFileSync(path, 'utf8');
    expect(content.startsWith('#!/usr/bin/env sh\n')).toBe(true);
    expect(content).toContain(HOOK_BLOCK_START);
    expect(isExecutable(path)).toBe(true);

    expect(uninstallHook({ cwd: repo, husky: true }).action).toBe('deleted');
    expect(existsSync(path)).toBe(false);
  });
});
