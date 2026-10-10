import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  filterPaths,
  isSearchableCandidate,
  listPathCandidatesWithMeta,
  toPosix,
} from './pathCandidates.js';

describe('pathCandidates', () => {
  it('filterPaths matches substring case-insensitively', () => {
    const c = ['src/foo.ts', 'test/bar.ts', 'other.md'];
    expect(filterPaths(c, 'ts')).toEqual(['src/foo.ts', 'test/bar.ts']);
  });

  it('filterPaths returns early slice when query empty', () => {
    const c = Array.from({ length: 250 }, (_, i) => `f${i}.ts`);
    expect(filterPaths(c, '').length).toBe(200);
  });

  it('toPosix normalizes separators', () => {
    expect(toPosix('a\\b\\c')).toBe('a/b/c');
  });

  it('isSearchableCandidate excludes node_modules-like paths', () => {
    expect(isSearchableCandidate('src/a.ts')).toBe(true);
    expect(isSearchableCandidate('node_modules/pkg/index.js')).toBe(false);
    expect(isSearchableCandidate('a/.pnpm/store')).toBe(false);
    expect(isSearchableCandidate('dist/index.js')).toBe(false);
  });

  describe('listPathCandidatesWithMeta (real directories)', () => {
    const dirs: string[] = [];
    const scratch = (): string => {
      const dir = mkdtempSync(join(tmpdir(), 'filelinks-paths-'));
      dirs.push(dir);
      mkdirSync(join(dir, 'apps/api/docs'), { recursive: true });
      mkdirSync(join(dir, 'node_modules/pkg'), { recursive: true });
      mkdirSync(join(dir, '.hidden'), { recursive: true });
      writeFileSync(join(dir, 'apps/api/docs/openapi.yaml'), 'x');
      writeFileSync(join(dir, 'apps/api/user.ts'), 'x');
      writeFileSync(join(dir, 'node_modules/pkg/index.js'), 'x');
      writeFileSync(join(dir, '.hidden/secret.txt'), 'x');
      return dir;
    };

    afterEach(() => {
      for (const dir of dirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('globs files and directories outside git, skipping node_modules and dot paths', () => {
      const { candidates, directories } = listPathCandidatesWithMeta(scratch());
      expect(candidates).toEqual([
        'apps',
        'apps/api',
        'apps/api/docs',
        'apps/api/docs/openapi.yaml',
        'apps/api/user.ts',
      ]);
      expect([...directories].sort()).toEqual([
        'apps',
        'apps/api',
        'apps/api/docs',
      ]);
    });

    it('lists tracked and untracked files plus their directories inside git', () => {
      const dir = scratch();
      execFileSync('git', ['init', '-q'], { cwd: dir });
      writeFileSync(join(dir, '.gitignore'), 'node_modules/\n');
      const { candidates, directories } = listPathCandidatesWithMeta(dir);
      expect(candidates).toContain('apps/api/user.ts');
      expect(candidates).toContain('apps/api/docs/openapi.yaml');
      expect(candidates).not.toContain('node_modules/pkg/index.js');
      expect(directories.has('apps/api/docs')).toBe(true);
    });
  });
});
