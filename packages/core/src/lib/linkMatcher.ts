/**
 * `trigger` and `affects[].file` patterns are **repository-root-relative**, matching
 * paths from `git diff` / `getStagedFilePaths` (POSIX-style segments).
 * Optional `entry.linkType` is metadata for tooling; it does not change minimatch behavior here.
 */
import { minimatch } from 'minimatch';

import type { AffectedFile, FileLinkEntry } from './schema';

export interface StagedLinkMatch {
  entry: FileLinkEntry;
  missingAffected: AffectedFile[];
}

export function matchStagedLinks(
  stagedPaths: string[],
  links: FileLinkEntry[],
): StagedLinkMatch[] {
  const results: StagedLinkMatch[] = [];

  for (const entry of links) {
    const triggered = stagedPaths.some((p) => minimatch(p, entry.trigger));
    if (!triggered) {
      continue;
    }

    const missingAffected: AffectedFile[] = [];
    for (const aff of entry.affects) {
      const covered = stagedPaths.some((p) => minimatch(p, aff.file));
      if (!covered) {
        missingAffected.push(aff);
      }
    }

    results.push({ entry, missingAffected });
  }

  return results;
}
