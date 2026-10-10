/**
 * Pure graph model of declared links (`trigger` → `affects[]`), used by
 * `filelinks graph` renderers (terminal / DOT / Mermaid / HTML / JSON).
 *
 * Optional staged info reuses {@link classifyStagedLinks} so graph status always
 * agrees with `filelinks check`.
 */
import * as Schema from 'effect/Schema';
import { Minimatch } from 'minimatch';

import { classifyStagedLinks } from './stagedClassifier';
import type { FileLinkEntry } from './schema';
import { LinkTypeSchema } from './schema';

export const LinkGraphNodeKindSchema = Schema.Literal(
  'trigger',
  'affect',
  'both',
);

export const LinkGraphSeveritySchema = Schema.Literal('warn', 'error');

export const LinkGraphNodeSchema = Schema.Struct({
  id: Schema.String,
  path: Schema.String,
  kind: LinkGraphNodeKindSchema,
  isGlob: Schema.Boolean,
  staged: Schema.optional(Schema.Boolean),
});

export const LinkGraphEdgeSchema = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  reason: Schema.String,
  severity: LinkGraphSeveritySchema,
  linkType: Schema.NullOr(LinkTypeSchema),
  linkIndex: Schema.Number,
  triggered: Schema.optional(Schema.Boolean),
  satisfied: Schema.optional(Schema.Boolean),
});

export const LinkGraphSchema = Schema.Struct({
  nodes: Schema.Array(LinkGraphNodeSchema),
  edges: Schema.Array(LinkGraphEdgeSchema),
  hasStagedInfo: Schema.Boolean,
});

export type LinkGraphNodeKind = Schema.Schema.Type<
  typeof LinkGraphNodeKindSchema
>;
export type LinkGraphNode = Schema.Schema.Type<typeof LinkGraphNodeSchema>;
export type LinkGraphEdge = Schema.Schema.Type<typeof LinkGraphEdgeSchema>;
export type LinkGraph = Schema.Schema.Type<typeof LinkGraphSchema>;

export interface BuildLinkGraphOptions {
  /** Repo-relative staged paths; when set, edges get `triggered` / `satisfied`. */
  staged?: readonly string[];
}

/** True when the pattern contains minimatch magic (`*`, `?`, `[…]`, `{a,b}`, …). */
export function isGlobPattern(pattern: string): boolean {
  const mm = new Minimatch(pattern);
  // Brace expansion (`{a,b}`) yields several literal sets; treat as a glob too.
  return mm.hasMagic() || mm.set.length > 1;
}

type MutableNode = {
  id: string;
  path: string;
  kind: LinkGraphNodeKind;
  isGlob: boolean;
  staged?: boolean;
};

export function buildLinkGraph(
  links: readonly FileLinkEntry[],
  opts?: BuildLinkGraphOptions,
): LinkGraph {
  const nodesByPath = new Map<string, MutableNode>();
  const order: MutableNode[] = [];

  const ensureNode = (
    path: string,
    role: 'trigger' | 'affect',
  ): MutableNode => {
    const existing = nodesByPath.get(path);
    if (existing) {
      if (existing.kind !== role && existing.kind !== 'both') {
        existing.kind = 'both';
      }
      return existing;
    }
    const node: MutableNode = {
      id: `n${order.length}`,
      path,
      kind: role,
      isGlob: isGlobPattern(path),
    };
    nodesByPath.set(path, node);
    order.push(node);
    return node;
  };

  const staged = opts?.staged;
  const coverage = staged
    ? classifyStagedLinks([...staged], [...links])
    : undefined;

  const edges: LinkGraphEdge[] = [];

  links.forEach((entry, linkIndex) => {
    const from = ensureNode(entry.trigger, 'trigger');
    const cov = coverage?.[linkIndex];
    if (cov) {
      from.staged = from.staged === true || cov.triggerMatched;
    }
    for (const aff of entry.affects) {
      const to = ensureNode(aff.file, 'affect');
      const edge: {
        -readonly [K in keyof LinkGraphEdge]: LinkGraphEdge[K];
      } = {
        from: from.id,
        to: to.id,
        reason: aff.reason,
        severity: entry.severity ?? 'warn',
        linkType: entry.linkType ?? null,
        linkIndex,
      };
      if (cov) {
        const inPlay = cov.triggerMatched || cov.affectMatched;
        const satisfied = inPlay && !cov.missingAffected.includes(aff);
        edge.triggered = cov.triggerMatched;
        edge.satisfied = satisfied;
        to.staged = to.staged === true || satisfied;
      }
      edges.push(edge);
    }
  });

  if (staged) {
    for (const node of order) {
      node.staged = node.staged === true;
    }
  }

  return {
    nodes: order.map((n) => ({ ...n })),
    edges,
    hasStagedInfo: staged !== undefined,
  };
}
