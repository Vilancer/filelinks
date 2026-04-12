import * as Schema from 'effect/Schema';

import type { LinkType } from './schema';
import { LinkTypeSchema } from './schema';

const isLinkTypeDecoded = Schema.is(LinkTypeSchema);

/** File vs directory end of a repo-relative path (metadata for `linkType`). */
export type PathEndKind = 'file' | 'dir';

export const LINK_TYPES: readonly LinkType[] = [
  'file-file',
  'dir-dir',
  'file-dir',
  'dir-file',
] as const;

/** Short labels for CLI, tables, and docs. */
export const LINK_TYPE_DESCRIPTIONS: Record<LinkType, string> = {
  'file-file':
    'File-level trigger to file-level companions (globs may match many files).',
  'dir-dir': 'Directory-level trigger to directory-level companions.',
  'file-dir': 'File-level trigger to directory-level companions.',
  'dir-file': 'Directory-level trigger to file-level companions.',
};

export function isLinkType(value: unknown): value is LinkType {
  return isLinkTypeDecoded(value);
}

/** Affects side is directory-level (`file-dir`, `dir-dir`) for companion checks in the matcher. */
export function isDirectoryLevelAffectedLinkType(
  linkType: LinkType | undefined,
): boolean {
  return linkType === 'file-dir' || linkType === 'dir-dir';
}

/**
 * Maps trigger vs companion path kinds to the canonical `linkType` literal
 * (aligned with {@link LinkTypeSchema} / {@link LINK_TYPES}).
 */
export function linkTypeForPathKinds(
  triggerKind: PathEndKind,
  affectKind: PathEndKind,
): LinkType {
  if (triggerKind === 'file' && affectKind === 'file') {
    return 'file-file';
  }
  if (triggerKind === 'file' && affectKind === 'dir') {
    return 'file-dir';
  }
  if (triggerKind === 'dir' && affectKind === 'file') {
    return 'dir-file';
  }
  return 'dir-dir';
}
