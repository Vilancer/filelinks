import { describe, expect, it } from 'vitest';

import {
  LINK_TYPE_DESCRIPTIONS,
  LINK_TYPES,
  isDirectoryLevelAffectedLinkType,
  isLinkType,
  linkTypeForPathKinds,
} from './linkType';
import type { LinkType } from './schema';

describe('linkType', () => {
  it('covers four relationship kinds', () => {
    expect(LINK_TYPES).toEqual([
      'file-file',
      'dir-dir',
      'file-dir',
      'dir-file',
    ]);
  });

  it('has a description for each link type', () => {
    for (const t of LINK_TYPES) {
      expect(LINK_TYPE_DESCRIPTIONS[t as LinkType].length).toBeGreaterThan(0);
    }
  });

  it('isLinkType narrows unknown input', () => {
    expect(isLinkType('file-file')).toBe(true);
    expect(isLinkType('nope')).toBe(false);
    expect(isLinkType(undefined)).toBe(false);
  });

  it('linkTypeForPathKinds matches LinkTypeSchema quadrants', () => {
    expect(linkTypeForPathKinds('file', 'file')).toBe('file-file');
    expect(linkTypeForPathKinds('file', 'dir')).toBe('file-dir');
    expect(linkTypeForPathKinds('dir', 'file')).toBe('dir-file');
    expect(linkTypeForPathKinds('dir', 'dir')).toBe('dir-dir');
  });

  it('isDirectoryLevelAffectedLinkType matches file-dir and dir-dir only', () => {
    expect(isDirectoryLevelAffectedLinkType(undefined)).toBe(false);
    expect(isDirectoryLevelAffectedLinkType('file-file')).toBe(false);
    expect(isDirectoryLevelAffectedLinkType('dir-file')).toBe(false);
    expect(isDirectoryLevelAffectedLinkType('file-dir')).toBe(true);
    expect(isDirectoryLevelAffectedLinkType('dir-dir')).toBe(true);
  });
});
