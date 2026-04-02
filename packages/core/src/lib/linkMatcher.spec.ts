import { describe, expect, it } from 'vitest';

import { matchStagedLinks } from './linkMatcher';
import type { FileLinkEntry } from './schema';

describe('matchStagedLinks', () => {
  it('reports missing affected when trigger matches but affect not staged', () => {
    const links: FileLinkEntry[] = [
      {
        trigger: 'apps/**/*.ts',
        affects: [{ file: 'docs/openapi.yaml', reason: 'Keep OpenAPI in sync' }],
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
});
