import { describe, expect, it } from 'vitest';

import { matchStagedLinks } from './linkMatcher';
import type { FileLinkEntry } from './schema';

describe('matchStagedLinks', () => {
  it('reports missing affected when trigger matches but affect not staged', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'apps/**/*.ts',
        affects: [
          { file: 'docs/openapi.yaml', reason: 'Keep OpenAPI in sync' },
        ],
      },
    ];
    const staged = ['apps/api/foo.ts'];
    const r = matchStagedLinks(staged, links);
    expect(r).toHaveLength(1);
    expect(r[0]?.missingAffected).toHaveLength(1);
    expect(r[0]?.missingAffected[0]?.file).toBe('docs/openapi.yaml');
  });

  it('does not trigger when no staged path matches trigger', () => {
    const links: FileLinkEntry[] = [
      { trigger: 'apps/**/*.ts', affects: [{ file: 'x', reason: 'y' }] },
    ];
    expect(matchStagedLinks(['other/file.ts'], links)).toHaveLength(0);
  });

  it('returns entry with linkType when provided', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'apps/**/*.ts',
        linkType: 'dir-file',
        affects: [{ file: 'docs/readme.md', reason: 'sync' }],
      },
    ];
    const r = matchStagedLinks(['apps/api/foo.ts'], links);
    expect(r).toHaveLength(1);
    expect(r[0]?.entry.linkType).toBe('dir-file');
  });

  it('file-dir: staged file under directory affect satisfies companion (prefix)', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'greet.ts',
        linkType: 'file-dir',
        affects: [{ file: 'malek', reason: 'test' }],
        severity: 'error',
      },
    ];
    const r = matchStagedLinks(['greet.ts', 'malek/nested/foo.ts'], links);
    expect(r).toHaveLength(1);
    expect(r[0]?.missingAffected).toHaveLength(0);
  });

  it('file-dir: only trigger staged still reports missing dir companion', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'greet.ts',
        linkType: 'file-dir',
        affects: [{ file: 'malek', reason: 'test' }],
      },
    ];
    const r = matchStagedLinks(['greet.ts'], links);
    expect(r).toHaveLength(1);
    expect(r[0]?.missingAffected).toHaveLength(1);
  });

  it('file-dir without linkType keeps minimatch-only (no prefix under dir)', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'greet.ts',
        affects: [{ file: 'malek', reason: 'legacy' }],
      },
    ];
    const r = matchStagedLinks(['greet.ts', 'malek/x.ts'], links);
    expect(r).toHaveLength(1);
    expect(r[0]?.missingAffected).toHaveLength(1);
  });

  it('dir-dir: staged path under directory affect satisfies companion', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'src/**',
        linkType: 'dir-dir',
        affects: [{ file: 'docs', reason: 'sync' }],
      },
    ];
    const r = matchStagedLinks(['src/a.ts', 'docs/readme.md'], links);
    expect(r).toHaveLength(1);
    expect(r[0]?.missingAffected).toHaveLength(0);
  });
});
