import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildLinkGraph,
  getStagedFilePaths,
  loadFileLinksConfig,
  normalizeError,
  type LinkGraph,
} from '@vilancer/filelinks-core';

import {
  renderGraphDot,
  renderGraphHtml,
  renderGraphMermaid,
  renderGraphTerminal,
} from './graphRender.js';

export const GRAPH_FORMATS = ['terminal', 'dot', 'mermaid', 'html'] as const;

export type GraphFormat = (typeof GRAPH_FORMATS)[number];

export type RunGraphOpts = {
  cwd: string;
  configPath?: string;
  json: boolean;
  format?: GraphFormat | string;
  /** Output file (relative to `cwd`). */
  output?: string;
  /** Overlay staged status from `git diff --cached`. */
  staged?: boolean;
};

function isGraphFormat(v: string): v is GraphFormat {
  return (GRAPH_FORMATS as readonly string[]).includes(v);
}

function useColor(): boolean {
  return process.stdout.isTTY === true && process.env['NO_COLOR'] === undefined;
}

function render(graph: LinkGraph, format: GraphFormat, color: boolean): string {
  switch (format) {
    case 'dot':
      return renderGraphDot(graph);
    case 'mermaid':
      return renderGraphMermaid(graph);
    case 'html':
      return renderGraphHtml(graph);
    case 'terminal':
      return renderGraphTerminal(graph, { color });
  }
}

export function runGraph(opts: RunGraphOpts): number {
  const format = opts.format ?? 'terminal';
  if (!isGraphFormat(format)) {
    console.error(
      `Invalid graph format "${format}". Expected one of: ${GRAPH_FORMATS.join(', ')}.`,
    );
    return 1;
  }

  let graph: LinkGraph;
  try {
    const loaded = loadFileLinksConfig(
      opts.cwd,
      opts.configPath ? { configPath: opts.configPath } : undefined,
    );
    const staged = opts.staged ? getStagedFilePaths(opts.cwd) : undefined;
    graph = buildLinkGraph(loaded.links, staged ? { staged } : undefined);
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }

  const text = opts.json
    ? JSON.stringify({ graph }, null, 2) + '\n'
    : render(graph, format, opts.output === undefined && useColor());

  if (opts.output !== undefined) {
    const target = resolve(opts.cwd, opts.output);
    try {
      writeFileSync(target, text, 'utf8');
    } catch (e: unknown) {
      const h = normalizeError(e);
      console.error(h.message);
      return 1;
    }
    console.error(`Wrote ${target}`);
    return 0;
  }

  process.stdout.write(text);
  return 0;
}
