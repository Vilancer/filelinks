import * as cp from 'node:child_process';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getGitRepoRoot,
  getStagedDiffForPaths,
  getStagedFilePaths,
} from './gitReader';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('gitReader', () => {
  beforeEach(() => {
    vi.mocked(cp.execFileSync).mockReset();
  });

  it('getGitRepoRoot parses rev-parse output', () => {
    vi.mocked(cp.execFileSync).mockReturnValue('/repo\n');
    expect(getGitRepoRoot('/cwd')).toBe('/repo');
    expect(cp.execFileSync).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd: '/cwd', encoding: 'utf8' }
    );
  });

  it('getStagedFilePaths splits null-delimited paths', () => {
    const buf = Buffer.from('a/b.ts\0c d.ts\0', 'utf8');
    vi.mocked(cp.execFileSync).mockReturnValue(buf);
    const paths = getStagedFilePaths('/cwd');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toEqual(['a/b.ts', 'c d.ts']);
    expect(cp.execFileSync).toHaveBeenCalledWith(
      'git',
      ['diff', '-z', '--name-only', '--cached'],
      { cwd: '/cwd' }
    );
  });

  it('getStagedDiffForPaths returns empty string without calling git when paths empty', () => {
    expect(getStagedDiffForPaths('/cwd', [])).toBe('');
    expect(cp.execFileSync).not.toHaveBeenCalled();
  });

  it('getStagedDiffForPaths runs git diff --cached for repo-relative paths', () => {
    vi.mocked(cp.execFileSync).mockReturnValue('diff --git a/foo.ts\n');
    expect(getStagedDiffForPaths('/cwd', ['foo.ts', 'bar/baz.ts'])).toBe(
      'diff --git a/foo.ts\n',
    );
    expect(cp.execFileSync).toHaveBeenCalledWith(
      'git',
      ['diff', '--cached', '--', 'foo.ts', 'bar/baz.ts'],
      { cwd: '/cwd', encoding: 'utf8' },
    );
  });
});
