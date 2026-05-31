import { describe, expect, it } from 'vitest';

import { matchStagedLinks } from './linkMatcher';
import { classifyStagedLinks } from './stagedClassifier';
import type { FileLinkEntry } from './schema';

describe('classifyStagedLinks', () => {
  it('returns one row per configured link', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'a.ts',
        affects: [{ file: 'b.ts', reason: 'one' }],
      },
      {
        trigger: 'c.ts',
        affects: [{ file: 'd.ts', reason: 'two' }],
      },
    ];
    expect(classifyStagedLinks([], links)).toHaveLength(2);
  });

  it('trigger only: affect not staged yields missingAffected', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'apps/**/*.ts',
        affects: [
          { file: 'docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
        ],
      },
    ];
    const staged = ['apps/api/foo.ts'];
    const [coverage] = classifyStagedLinks(staged, links);
    expect(coverage?.triggerMatched).toBe(true);
    expect(coverage?.affectMatched).toBe(false);
    expect(coverage?.missingAffected).toHaveLength(1);
    expect(coverage?.missingAffected[0]?.file).toBe('docs/openapi.yaml');
  });

  it('file-dir: staged file under directory affect satisfies companion', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'greet.ts',
        linkType: 'file-dir',
        affects: [{ file: 'malek', reason: 'test' }],
      },
    ];
    const staged = ['greet.ts', 'malek/nested/foo.ts'];
    const [coverage] = classifyStagedLinks(staged, links);
    expect(coverage?.affectMatched).toBe(true);
    expect(coverage?.missingAffected).toHaveLength(0);
  });

  it('affect-only: affect matched without trigger', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'greet.ts',
        linkType: 'file-dir',
        affects: [{ file: 'malek', reason: 'test' }],
      },
    ];
    const staged = ['malek/nested/foo.ts'];
    const [coverage] = classifyStagedLinks(staged, links);
    expect(coverage?.triggerMatched).toBe(false);
    expect(coverage?.affectMatched).toBe(true);
    expect(coverage?.triggerPaths).toEqual([]);
    expect(coverage?.affectPaths).toContain('malek/nested/foo.ts');
    expect(matchStagedLinks(staged, links)).toHaveLength(0);
  });

  it('neither matched: all false and empty arrays', () => {
    const links: FileLinkEntry[] = [
      { trigger: 'apps/**/*.ts', affects: [{ file: 'x', reason: 'y' }] },
    ];
    const [coverage] = classifyStagedLinks(['other/file.ts'], links);
    expect(coverage?.triggerMatched).toBe(false);
    expect(coverage?.affectMatched).toBe(false);
    expect(coverage?.triggerPaths).toEqual([]);
    expect(coverage?.affectPaths).toEqual([]);
    expect(coverage?.missingAffected).toEqual([]);
  });
});
