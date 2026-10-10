import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  changedSinceSnapshot,
  getStagedFilePaths,
  snapshotDirtyPaths,
  stagePaths,
} from './gitReader';

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

describe('working-tree snapshots (real git repo)', () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'filelinks-wt-'));
    git(repo, 'init', '-q', '-b', 'main');
    mkdirSync(join(repo, 'docs'));
    writeFileSync(join(repo, 'docs/api.md'), 'v1\n');
    writeFileSync(join(repo, 'notes.md'), 'mine\n');
    git(repo, 'add', '-A');
    git(
      repo,
      '-c',
      'user.email=t@t',
      '-c',
      'user.name=t',
      'commit',
      '-qm',
      'init',
    );
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('reports only paths written after the first snapshot', () => {
    writeFileSync(join(repo, 'notes.md'), 'user edit before the agent\n');
    const before = snapshotDirtyPaths(repo);

    writeFileSync(join(repo, 'docs/api.md'), 'v2 from the agent\n');
    writeFileSync(join(repo, 'docs/new.md'), 'created by the agent\n');
    const after = snapshotDirtyPaths(repo);

    expect(changedSinceSnapshot(before, after).sort()).toEqual([
      'docs/api.md',
      'docs/new.md',
    ]);
  });

  it('counts a second write to an already-dirty file as a change', () => {
    writeFileSync(join(repo, 'docs/api.md'), 'user draft\n');
    const before = snapshotDirtyPaths(repo);
    writeFileSync(join(repo, 'docs/api.md'), 'agent rewrite\n');
    expect(changedSinceSnapshot(before, snapshotDirtyPaths(repo))).toEqual([
      'docs/api.md',
    ]);
  });

  it('uses repo-root paths from a subdirectory and stages them', () => {
    const sub = join(repo, 'docs');
    const before = snapshotDirtyPaths(sub);
    writeFileSync(join(repo, 'docs/api.md'), 'v2\n');
    const changed = changedSinceSnapshot(before, snapshotDirtyPaths(sub));
    expect(changed).toEqual(['docs/api.md']);

    stagePaths(sub, changed);
    expect(getStagedFilePaths(repo)).toEqual(['docs/api.md']);
  });

  it('returns an empty snapshot for a clean tree', () => {
    expect(snapshotDirtyPaths(repo).size).toBe(0);
  });

  it('ignores a dirty submodule instead of failing the whole snapshot', () => {
    const sub = mkdtempSync(join(tmpdir(), 'filelinks-wt-sub-'));
    try {
      git(sub, 'init', '-q', '-b', 'main');
      writeFileSync(join(sub, 'a.txt'), 'a\n');
      git(sub, 'add', '-A');
      git(
        sub,
        '-c',
        'user.email=t@t',
        '-c',
        'user.name=t',
        'commit',
        '-qm',
        'a',
      );
      git(
        repo,
        '-c',
        'protocol.file.allow=always',
        'submodule',
        'add',
        '-q',
        sub,
        'vendor/sub',
      );
      git(
        repo,
        '-c',
        'user.email=t@t',
        '-c',
        'user.name=t',
        'commit',
        '-qm',
        'sub',
      );
      writeFileSync(join(repo, 'vendor/sub/a.txt'), 'dirty\n');

      const before = snapshotDirtyPaths(repo);
      writeFileSync(join(repo, 'docs/api.md'), 'v2\n');
      expect(changedSinceSnapshot(before, snapshotDirtyPaths(repo))).toEqual([
        'docs/api.md',
      ]);
    } finally {
      rmSync(sub, { recursive: true, force: true });
    }
  });
});
