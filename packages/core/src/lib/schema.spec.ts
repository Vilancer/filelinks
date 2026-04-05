import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';

import { defineLinks, FileLinkEntrySchema } from './schema';

describe('defineLinks', () => {
  it('normalizes omitted config to empty object', () => {
    const { config } = defineLinks([], undefined);
    expect(config).toEqual({});
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('preserves explicit empty config object', () => {
    const { config } = defineLinks([], {});
    expect(config).toEqual({});
    expect(Object.keys(config)).toHaveLength(0);
  });

  it('preserves optional linkType on entries', () => {
    const { links } = defineLinks([
      {
        trigger: 'src/**/*.ts',
        linkType: 'file-file',
        affects: [{ file: 'README.md', reason: 'Docs' }],
      },
    ]);
    expect(links[0]?.linkType).toBe('file-file');
  });

  it('rejects invalid link entries at decode', () => {
    expect(() =>
      Schema.decodeUnknownSync(FileLinkEntrySchema)({
        trigger: 1,
        affects: [],
      }),
    ).toThrow();
  });
});
