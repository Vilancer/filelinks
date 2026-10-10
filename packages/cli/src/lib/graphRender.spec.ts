import type { LinkGraph } from '@vilancer/filelinks-core';
import { describe, expect, it } from 'vitest';

import {
  escapeDot,
  escapeMermaid,
  MERMAID_CDN_INTEGRITY,
  MERMAID_CDN_URL,
  renderGraphDot,
  renderGraphHtml,
  renderGraphMermaid,
  renderGraphTerminal,
} from './graphRender.js';

const graph: LinkGraph = {
  hasStagedInfo: false,
  nodes: [
    {
      id: 'n0',
      path: 'apps/api/src/routes/user.ts',
      kind: 'trigger',
      isGlob: false,
    },
    {
      id: 'n1',
      path: 'apps/api/docs/openapi.yaml',
      kind: 'affect',
      isGlob: false,
    },
    { id: 'n2', path: 'docs/api.md', kind: 'affect', isGlob: false },
    { id: 'n3', path: 'packages/**/*.ts', kind: 'trigger', isGlob: true },
  ],
  edges: [
    {
      from: 'n0',
      to: 'n1',
      reason: 'keep OpenAPI in sync',
      severity: 'error',
      linkType: 'file-file',
      linkIndex: 0,
    },
    {
      from: 'n0',
      to: 'n2',
      reason: 'say "hi" \\ <script>alert(1)</script> #1 & more',
      severity: 'warn',
      linkType: 'file-file',
      linkIndex: 0,
    },
    {
      from: 'n3',
      to: 'n2',
      reason: 'api docs',
      severity: 'warn',
      linkType: null,
      linkIndex: 1,
    },
  ],
};

const stagedGraph: LinkGraph = {
  hasStagedInfo: true,
  nodes: graph.nodes.map((n) => ({
    ...n,
    staged: n.id === 'n0' || n.id === 'n2',
  })),
  edges: graph.edges.map((e, i) => ({
    ...e,
    triggered: i < 2,
    satisfied: i !== 0,
  })),
};

const empty: LinkGraph = { nodes: [], edges: [], hasStagedInfo: false };

describe('renderGraphTerminal', () => {
  it('prints friendly line for empty config', () => {
    expect(renderGraphTerminal(empty)).toBe('No links declared.\n');
  });

  it('groups by trigger with tree glyphs and no ANSI by default', () => {
    const out = renderGraphTerminal(graph);
    const lines = out.trimEnd().split('\n');
    expect(lines[0]).toBe('apps/api/src/routes/user.ts  (file-file)');
    expect(lines[1]).toBe(
      '├─▶ apps/api/docs/openapi.yaml  [error]  keep OpenAPI in sync',
    );
    expect(lines[2]).toMatch(/^└─▶ docs\/api\.md {2}\[warn\]/);
    expect(lines[3]).toBe('');
    expect(lines[4]).toBe('packages/**/*.ts  (glob)');
    expect(lines[5]).toBe('└─▶ docs/api.md  [warn]  api docs');
    expect(out).not.toContain('\x1b[');
  });

  it('marks triggered / satisfied / missing when staged info present', () => {
    const out = renderGraphTerminal(stagedGraph);
    expect(out).toContain('● triggered');
    expect(out).toMatch(/openapi\.yaml.*✗ missing/);
    expect(out).toMatch(/docs\/api\.md.*✓/);
    expect(out).toMatch(/api docs {2}\(staged\)/);
  });

  it('uses ANSI codes only when color is true', () => {
    expect(renderGraphTerminal(graph, { color: true })).toContain('\x1b[31m');
  });
});

describe('renderGraphDot', () => {
  it('escapes quotes, backslashes and newlines', () => {
    expect(escapeDot('a "b" \\ c\nd')).toBe('a \\"b\\" \\\\ c\\nd');
  });

  it('produces a digraph with styled nodes/edges', () => {
    const out = renderGraphDot(graph);
    expect(out.startsWith('digraph filelinks {\n  rankdir=LR;')).toBe(true);
    expect(out.trimEnd().endsWith('}')).toBe(true);
    expect(out).toContain('n0 [label="apps/api/src/routes/user.ts"];');
    expect(out).toMatch(
      /n3 \[label="packages\/\*\*\/\*\.ts", shape=folder, style="dashed"\];/,
    );
    expect(out).toContain(
      'n0 -> n1 [label="keep OpenAPI in sync", color="red", style=bold];',
    );
    expect(out).toContain('label="say \\"hi\\" \\\\ <script>');
  });

  it('highlights triggered edges with staged info', () => {
    const out = renderGraphDot(stagedGraph);
    expect(out).toMatch(
      /n0 -> n1 \[label="keep OpenAPI in sync ✗", color="red".*penwidth=3/,
    );
    expect(out).toMatch(/n0 -> n2 .*✓", color="darkgreen", penwidth=3/);
    expect(out).toContain('n3 -> n2 [label="api docs", color="gray50"];');
    expect(out).toContain(
      'n0 [label="apps/api/src/routes/user.ts", fillcolor="#e0f2e9", style="filled"];',
    );
  });

  it('renders empty graph as valid digraph', () => {
    expect(renderGraphDot(empty)).toMatch(/^digraph filelinks \{[\s\S]*\}\n$/);
  });
});

describe('renderGraphMermaid', () => {
  it('escapes labels using entity codes', () => {
    expect(escapeMermaid('a "b" <c> & #1\nx')).toBe(
      'a #quot;b#quot; #lt;c#gt; #amp; #35;1 x',
    );
  });

  it('emits flowchart LR with nodes, edges and glob shape', () => {
    const out = renderGraphMermaid(graph);
    const lines = out.trimEnd().split('\n');
    expect(lines[0]).toBe('flowchart LR');
    expect(out).toContain('  n0["apps/api/src/routes/user.ts"]');
    expect(out).toContain('  n3[/"packages/**/*.ts"/]');
    expect(out).toContain('  n0 ==>|"keep OpenAPI in sync"| n1');
    expect(out).toContain('  n3 -->|"api docs"| n2');
    expect(out).not.toMatch(/<script>/);
    expect(out).not.toMatch(/"hi"/);
  });

  it('styles staged nodes and triggered edges', () => {
    const out = renderGraphMermaid(stagedGraph);
    expect(out).toContain('linkStyle 0 stroke:#d32f2f,stroke-width:3px');
    expect(out).toContain('linkStyle 1 stroke:#2e7d32,stroke-width:3px');
    expect(out).toContain('class n0,n2 staged');
  });

  it('renders placeholder for empty graph', () => {
    expect(renderGraphMermaid(empty)).toContain('empty["No links declared."]');
  });
});

describe('renderGraphHtml', () => {
  it('is a self-contained document with pinned mermaid and a table', () => {
    const out = renderGraphHtml(graph, { title: 'My <graph>' });
    expect(out.startsWith('<!doctype html>')).toBe(true);
    expect(out).toContain('<title>My &lt;graph&gt;</title>');
    expect(out).toContain(
      `<script src="${MERMAID_CDN_URL}" integrity="${MERMAID_CDN_INTEGRITY}" crossorigin="anonymous"></script>`,
    );
    expect(MERMAID_CDN_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(MERMAID_CDN_URL).toBe(
      'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js',
    );
    expect(out).toContain('<pre class="mermaid">');
    expect(out).toContain('prefers-color-scheme: dark');
    expect(out).toContain('<th>Trigger</th>');
    expect(out).not.toContain('<th>Status</th>');
    expect(out.match(/<tr><td>/g)).toHaveLength(3);
  });

  it('escapes <script> in reasons', () => {
    const out = renderGraphHtml(graph);
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('say &quot;hi&quot;');
  });

  it('adds a status column with staged info', () => {
    const out = renderGraphHtml(stagedGraph);
    expect(out).toContain('<th>Status</th>');
    expect(out).toContain('<td class="st-missing">✗ missing</td>');
    expect(out).toContain('<td class="st-satisfied">✓ satisfied</td>');
    expect(out).toContain('1 missing');
  });

  it('handles empty graph without a diagram', () => {
    const out = renderGraphHtml(empty);
    expect(out).toContain('No links declared.');
    expect(out).not.toContain('mermaid.min.js');
  });
});
