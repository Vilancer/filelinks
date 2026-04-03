import type { LinkType } from './schema';

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
  return (
    typeof value === 'string' &&
    (LINK_TYPES as readonly string[]).includes(value)
  );
}
