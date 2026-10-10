import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'vitest';

import { buildLinkGraph, isGlobPattern, LinkGraphSchema } from './linkGraph';
import type { FileLinkEntry } from './schema';

const links: FileLinkEntry[] = [
  {
    trigger: 'apps/api/src/routes/user.ts',
    linkType: 'file-file',
    severity: 'error',
    affects: [
      { file: 'apps/api/docs/openapi.yaml', reason: 'keep OpenAPI in sync' },
      { file: 'docs/api.md', reason: 'docs' },
    ],
  },
  {
    trigger: 'apps/api/docs/openapi.yaml',
    affects: [{ file: 'clients/**/*.ts', reason: 'regen client' }],
  },
  {
    trigger: 'packages/**/*.ts',
    affects: [{ file: 'docs/api.md', reason: 'api docs' }],
  },
];

describe('isGlobPattern', () => {
  it('detects minimatch magic', () => {
    expect(isGlobPattern('a/b.ts')).toBe(false);
    expect(isGlobPattern('a/**/*.ts')).toBe(true);
    expect(isGlobPattern('a/?.ts')).toBe(true);
    expect(isGlobPattern('a/{x,y}.ts')).toBe(true);
    expect(isGlobPattern('a/[ab].ts')).toBe(true);
  });
});

describe('buildLinkGraph', () => {
  it('returns empty graph for no links', () => {
    expect(buildLinkGraph([])).toEqual({
      nodes: [],
      edges: [],
      hasStagedInfo: false,
    });
  });

  it('dedupes nodes in first-appearance order with stable ids', () => {
    const g = buildLinkGraph(links);
    expect(g.nodes.map((n) => [n.id, n.path])).toEqual([
      ['n0', 'apps/api/src/routes/user.ts'],
      ['n1', 'apps/api/docs/openapi.yaml'],
      ['n2', 'docs/api.md'],
      ['n3', 'clients/**/*.ts'],
      ['n4', 'packages/**/*.ts'],
    ]);
    expect(buildLinkGraph(links)).toEqual(g);
  });

  it('marks kinds (trigger/affect/both) and glob nodes', () => {
    const g = buildLinkGraph(links);
    const byPath = Object.fromEntries(g.nodes.map((n) => [n.path, n]));
    expect(byPath['apps/api/src/routes/user.ts']?.kind).toBe('trigger');
    expect(byPath['apps/api/docs/openapi.yaml']?.kind).toBe('both');
    expect(byPath['docs/api.md']?.kind).toBe('affect');
    expect(byPath['clients/**/*.ts']?.isGlob).toBe(true);
    expect(byPath['docs/api.md']?.isGlob).toBe(false);
    expect(byPath['docs/api.md']?.staged).toBeUndefined();
  });

  it('creates one edge per (link, affect) with defaults', () => {
    const g = buildLinkGraph(links);
    expect(g.edges).toHaveLength(4);
    expect(g.edges[0]).toEqual({
      from: 'n0',
      to: 'n1',
      reason: 'keep OpenAPI in sync',
      severity: 'error',
      linkType: 'file-file',
      linkIndex: 0,
    });
    expect(g.edges[2]).toMatchObject({
      from: 'n1',
      to: 'n3',
      severity: 'warn',
      linkType: null,
      linkIndex: 1,
    });
  });

  it('computes triggered/satisfied and node.staged using the core matcher', () => {
    const g = buildLinkGraph(links, {
      staged: ['apps/api/src/routes/user.ts', 'docs/api.md'],
    });
    expect(g.hasStagedInfo).toBe(true);
    expect(g.edges.map((e) => [e.triggered, e.satisfied])).toEqual([
      [true, false], // openapi missing
      [true, true], // docs/api.md staged
      [false, false], // trigger openapi not staged
      [false, true], // affect staged without trigger (in play via affect)
    ]);
    const staged = Object.fromEntries(g.nodes.map((n) => [n.path, n.staged]));
    expect(staged).toEqual({
      'apps/api/src/routes/user.ts': true,
      'apps/api/docs/openapi.yaml': false,
      'docs/api.md': true,
      'clients/**/*.ts': false,
      'packages/**/*.ts': false,
    });
  });

  it('honors dir-level linkType prefix rule for satisfied', () => {
    const g = buildLinkGraph(
      [
        {
          trigger: 'src/*.ts',
          linkType: 'file-dir',
          affects: [{ file: 'docs', reason: 'dir docs' }],
        },
      ],
      { staged: ['src/a.ts', 'docs/x/y.md'] },
    );
    expect(g.edges[0]).toMatchObject({ triggered: true, satisfied: true });
    expect(g.nodes.every((n) => n.staged)).toBe(true);
  });

  it('produces a value that decodes with LinkGraphSchema', () => {
    const g = buildLinkGraph(links, { staged: [] });
    expect(Schema.decodeUnknownSync(LinkGraphSchema)(g)).toEqual(g);
  });
});
