/**
 * Pure renderers for `filelinks graph` (terminal tree, Graphviz DOT, Mermaid, HTML).
 * All take a {@link LinkGraph} from `@vilancer/filelinks-core` and return text.
 */
import type {
  LinkGraph,
  LinkGraphEdge,
  LinkGraphNode,
} from '@vilancer/filelinks-core';

export const MERMAID_CDN_URL =
  'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';
/** Subresource Integrity hash of exactly that file, so a tampered CDN copy doesn't run. */
export const MERMAID_CDN_INTEGRITY =
  'sha384-rbtjAdnIQE/aQJGEgXrVUlMibdfTSa4PQju4HDhN3sR2PmaKFzhEafuePsl9H/9I';

const NO_LINKS = 'No links declared.';

type EdgeStatus = 'satisfied' | 'missing' | 'staged' | 'idle' | null;

/** Staged status of one edge; `null` when the graph has no staged info. */
export function edgeStatus(edge: LinkGraphEdge): EdgeStatus {
  if (edge.triggered === undefined && edge.satisfied === undefined) {
    return null;
  }
  if (edge.triggered) {
    return edge.satisfied ? 'satisfied' : 'missing';
  }
  return edge.satisfied ? 'staged' : 'idle';
}

function nodeIndex(graph: LinkGraph): Map<string, LinkGraphNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

function pathOf(nodes: Map<string, LinkGraphNode>, id: string): string {
  return nodes.get(id)?.path ?? id;
}

/** Edges grouped by declared link (`linkIndex`), preserving config order. */
function groupByLink(graph: LinkGraph): LinkGraphEdge[][] {
  const groups = new Map<number, LinkGraphEdge[]>();
  for (const e of graph.edges) {
    const g = groups.get(e.linkIndex);
    if (g) {
      g.push(e);
    } else {
      groups.set(e.linkIndex, [e]);
    }
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
} as const;

export type RenderTerminalOpts = { color?: boolean };

export function renderGraphTerminal(
  graph: LinkGraph,
  opts: RenderTerminalOpts = {},
): string {
  const paint = (code: keyof typeof ANSI, s: string): string =>
    opts.color ? `${ANSI[code]}${s}${ANSI.reset}` : s;

  if (graph.edges.length === 0) {
    return NO_LINKS + '\n';
  }

  const nodes = nodeIndex(graph);
  const lines: string[] = [];
  const groups = groupByLink(graph);

  groups.forEach((edges, gi) => {
    const first = edges[0];
    if (!first) {
      return;
    }
    const triggerNode = nodes.get(first.from);
    let header = paint('bold', pathOf(nodes, first.from));
    if (first.linkType !== null) {
      header += '  ' + paint('dim', `(${first.linkType})`);
    }
    if (triggerNode?.isGlob) {
      header += '  ' + paint('dim', '(glob)');
    }
    if (first.triggered) {
      header += '  ' + paint('cyan', '● triggered');
    }
    lines.push(header);

    edges.forEach((e, i) => {
      const last = i === edges.length - 1;
      const glyph = paint('dim', last ? '└─▶' : '├─▶');
      const sev =
        e.severity === 'error'
          ? paint('red', '[error]')
          : paint('yellow', '[warn]');
      let line = `${glyph} ${pathOf(nodes, e.to)}  ${sev}  ${e.reason}`;
      const status = edgeStatus(e);
      if (status === 'satisfied') {
        line += '  ' + paint('green', '✓');
      } else if (status === 'missing') {
        line += '  ' + paint('red', '✗ missing');
      } else if (status === 'staged') {
        line += '  ' + paint('dim', '(staged)');
      }
      lines.push(line);
    });

    if (gi < groups.length - 1) {
      lines.push('');
    }
  });

  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Graphviz DOT
// ---------------------------------------------------------------------------

/** Escape a string for use inside a double-quoted DOT ID / label. */
export function escapeDot(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

export function renderGraphDot(graph: LinkGraph): string {
  const out: string[] = [
    'digraph filelinks {',
    '  rankdir=LR;',
    '  node [shape=box, fontname="Helvetica"];',
    '  edge [fontname="Helvetica", fontsize=10];',
  ];

  for (const n of graph.nodes) {
    const attrs = [`label="${escapeDot(n.path)}"`];
    const styles: string[] = [];
    if (n.isGlob) {
      attrs.push('shape=folder');
      styles.push('dashed');
    }
    if (n.staged) {
      styles.push('filled');
      attrs.push('fillcolor="#e0f2e9"');
    }
    if (styles.length > 0) {
      attrs.push(`style="${styles.join(',')}"`);
    }
    out.push(`  ${n.id} [${attrs.join(', ')}];`);
  }

  for (const e of graph.edges) {
    const status = edgeStatus(e);
    let label = e.reason;
    if (status === 'satisfied') {
      label += ' ✓';
    } else if (status === 'missing') {
      label += ' ✗';
    }
    const attrs = [`label="${escapeDot(label)}"`];
    if (status === 'satisfied') {
      attrs.push('color="darkgreen"', 'penwidth=3');
    } else if (status === 'missing') {
      attrs.push('color="red"', 'fontcolor="red"', 'penwidth=3', 'style=bold');
    } else if (e.severity === 'error') {
      attrs.push('color="red"', 'style=bold');
    } else if (status !== null) {
      attrs.push('color="gray50"');
    }
    out.push(`  ${e.from} -> ${e.to} [${attrs.join(', ')}];`);
  }

  out.push('}');
  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Mermaid
// ---------------------------------------------------------------------------

/** Escape text for a double-quoted Mermaid label (entity codes). */
export function escapeMermaid(s: string): string {
  return s
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/&/g, '#amp;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\r?\n/g, ' ');
}

export function renderGraphMermaid(graph: LinkGraph): string {
  const out: string[] = ['flowchart LR'];
  if (graph.nodes.length === 0) {
    out.push(`  empty["${NO_LINKS}"]`);
    return out.join('\n') + '\n';
  }

  for (const n of graph.nodes) {
    const label = `"${escapeMermaid(n.path)}"`;
    out.push(n.isGlob ? `  ${n.id}[/${label}/]` : `  ${n.id}[${label}]`);
  }

  const linkStyles: string[] = [];
  graph.edges.forEach((e, i) => {
    const arrow = e.severity === 'error' ? '==>' : '-->';
    out.push(`  ${e.from} ${arrow}|"${escapeMermaid(e.reason)}"| ${e.to}`);
    const status = edgeStatus(e);
    if (status === 'satisfied') {
      linkStyles.push(`  linkStyle ${i} stroke:#2e7d32,stroke-width:3px`);
    } else if (status === 'missing') {
      linkStyles.push(`  linkStyle ${i} stroke:#d32f2f,stroke-width:3px`);
    } else if (status === null && e.severity === 'error') {
      linkStyles.push(`  linkStyle ${i} stroke:#d32f2f`);
    }
  });
  out.push(...linkStyles);

  const stagedIds = graph.nodes.filter((n) => n.staged).map((n) => n.id);
  if (stagedIds.length > 0) {
    out.push('  classDef staged fill:#e0f2e9,stroke:#2e7d32,color:#1b5e20');
    out.push(`  class ${stagedIds.join(',')} staged`);
  }

  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STATUS_LABEL: Record<Exclude<EdgeStatus, null>, string> = {
  satisfied: '✓ satisfied',
  missing: '✗ missing',
  staged: 'staged',
  idle: '—',
};

export type RenderHtmlOpts = { title?: string };

export function renderGraphHtml(
  graph: LinkGraph,
  opts: RenderHtmlOpts = {},
): string {
  const title = escapeHtml(opts.title ?? 'filelinks graph');
  const nodes = nodeIndex(graph);
  const showStatus = graph.hasStagedInfo;
  const empty = graph.edges.length === 0;

  const headCells = [
    'Trigger',
    'Affected',
    'Reason',
    'Severity',
    'linkType',
    ...(showStatus ? ['Status'] : []),
  ]
    .map((h) => `<th>${h}</th>`)
    .join('');

  const rows = graph.edges
    .map((e) => {
      const status = edgeStatus(e);
      const cells = [
        `<td><code>${escapeHtml(pathOf(nodes, e.from))}</code></td>`,
        `<td><code>${escapeHtml(pathOf(nodes, e.to))}</code></td>`,
        `<td>${escapeHtml(e.reason)}</td>`,
        `<td class="sev-${e.severity}">${e.severity}</td>`,
        `<td>${escapeHtml(e.linkType ?? '—')}</td>`,
      ];
      if (showStatus) {
        cells.push(
          `<td class="st-${status ?? 'idle'}">${
            status ? STATUS_LABEL[status] : '—'
          }</td>`,
        );
      }
      return `      <tr>${cells.join('')}</tr>`;
    })
    .join('\n');

  const summary = `${graph.nodes.length} nodes · ${graph.edges.length} edges${
    showStatus
      ? ` · ${graph.edges.filter((e) => edgeStatus(e) === 'missing').length} missing`
      : ''
  }`;

  const body = empty
    ? `  <p class="empty">${NO_LINKS}</p>`
    : `  <section class="diagram">
    <pre class="mermaid">
${escapeHtml(renderGraphMermaid(graph))}</pre>
  </section>
  <section>
    <h2>Links</h2>
    <div class="table-wrap">
    <table>
      <thead><tr>${headCells}</tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>
  </section>
  <script src="${MERMAID_CDN_URL}" integrity="${MERMAID_CDN_INTEGRITY}" crossorigin="anonymous"></script>
  <script>
    (function () {
      if (typeof mermaid === 'undefined') return;
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      mermaid.initialize({ startOnLoad: true, securityLevel: 'strict', theme: dark ? 'dark' : 'default' });
    })();
  </script>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      --bg: #ffffff; --fg: #1f2328; --muted: #656d76; --border: #d0d7de;
      --head: #f6f8fa; --err: #cf222e; --warn: #9a6700; --ok: #1a7f37;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117; --fg: #e6edf3; --muted: #8d96a0; --border: #30363d;
        --head: #161b22; --err: #ff7b72; --warn: #d29922; --ok: #3fb950;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg);
      font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 24px 0 8px; }
    .summary, .empty { color: var(--muted); margin: 0; }
    .diagram { margin-top: 16px; overflow-x: auto; }
    pre.mermaid { background: transparent; margin: 0; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: var(--head); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
    .sev-error, .st-missing { color: var(--err); font-weight: 600; }
    .sev-warn { color: var(--warn); }
    .st-satisfied { color: var(--ok); }
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p class="summary">${summary}</p>
${body}
</main>
</body>
</html>
`;
}
