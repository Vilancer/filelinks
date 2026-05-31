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

  it('accepts trigger-or-affects at global and per-link levels', () => {
    const { links, config } = defineLinks(
      [
        {
          trigger: 'a.ts',
          affects: [{ file: 'b.ts', reason: 'sync' }],
          agent: { runPolicy: 'trigger-or-affects' },
        },
      ],
      { agent: { runPolicy: 'trigger-or-affects' } },
    );
    expect(config.agent?.runPolicy).toBe('trigger-or-affects');
    expect(links[0]?.agent?.runPolicy).toBe('trigger-or-affects');
  });

  it('rejects invalid agent runPolicy at decode', () => {
    expect(() =>
      defineLinks([
        {
          trigger: 'a.ts',
          affects: [],
          agent: { runPolicy: 'trigger-only' as 'trigger-or-affects' },
        },
      ]),
    ).toThrow();

    expect(() =>
      defineLinks([], {
        agent: { runPolicy: 'always' as 'trigger-or-affects' },
      }),
    ).toThrow();
  });

  it('accepts agent execution fields at global and per-link levels', () => {
    const { links, config } = defineLinks(
      [
        {
          trigger: 'a.ts',
          affects: [{ file: 'b.ts', reason: 'sync' }],
          agent: {
            provider: 'cursor',
            runtime: 'local',
            local: { cwd: '.' },
          },
        },
      ],
      {
        agent: {
          provider: 'cursor',
          runtime: 'cloud',
          cloud: { repos: ['org/repo'] },
        },
      },
    );
    expect(config.agent?.provider).toBe('cursor');
    expect(config.agent?.runtime).toBe('cloud');
    expect(links[0]?.agent?.provider).toBe('cursor');
    expect(links[0]?.agent?.runtime).toBe('local');
    expect(links[0]?.agent?.local?.cwd).toBe('.');
  });

  it('rejects invalid agent provider at decode', () => {
    expect(() =>
      defineLinks([
        {
          trigger: 'a.ts',
          affects: [],
          agent: { provider: 'openai' as 'cursor' },
        },
      ]),
    ).toThrow();
  });

  it('rejects invalid agent runtime at decode', () => {
    expect(() =>
      defineLinks([
        {
          trigger: 'a.ts',
          affects: [],
          agent: { runtime: 'hybrid' as 'local' },
        },
      ]),
    ).toThrow();
  });
});
