import { describe, expect, it } from 'vitest';

import {
  filterPaths,
  isSearchableCandidate,
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
});
