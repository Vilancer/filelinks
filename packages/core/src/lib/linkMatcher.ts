/**
 * `trigger` and `affects[].file` patterns are **repository-root-relative**, matching
 * paths from `git diff` / `getStagedFilePaths` (POSIX-style segments).
 *
 * **Triggers** always use `minimatch`. **Affected** paths use `minimatch` for every
 * `linkType`. When `linkType` is **`file-dir`** or **`dir-dir`**, a directory companion
 * is also satisfied if any staged path lies **under** that directory (repo-relative
 * prefix), so e.g. affect `malek` covers staged `malek/index.ts`. Configs **without**
 * `linkType` keep legacy minimatch-only behavior.
 */
import { minimatch } from 'minimatch';

import { isDirectoryLevelAffectedLinkType } from './linkType';
import type { AffectedFile, FileLinkEntry } from './schema';

export interface StagedLinkMatch {
  entry: FileLinkEntry;
  missingAffected: AffectedFile[];
}

/**
 * Directory root for prefix matching when `linkType` marks the affect as directory-level.
 * Returns `null` if the pattern still needs pure glob semantics (e.g. any-path globs).
 */
function directoryRootForDirLevelAffect(affectGlob: string): string | null {
  const trimmed = affectGlob.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith('/**')) {
    const base = trimmed.slice(0, -3).replace(/\/+$/, '');
    return base || null;
  }
  if (['*', '?', '[', '{', '}', ']'].some((ch) => trimmed.includes(ch))) {
    return null;
  }
  return trimmed;
}

function stagedCoversAffected(
  stagedPaths: string[],
  affectFile: string,
  linkType: FileLinkEntry['linkType'],
): boolean {
  if (stagedPaths.some((p) => minimatch(p, affectFile))) {
    return true;
  }
  if (!isDirectoryLevelAffectedLinkType(linkType)) {
    return false;
  }
  const root = directoryRootForDirLevelAffect(affectFile);
  if (root === null) {
    return false;
  }
  const rootPrefix = root + '/';
  return stagedPaths.some((p) => p === root || p.startsWith(rootPrefix));
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
      const covered = stagedCoversAffected(
        stagedPaths,
        aff.file,
        entry.linkType,
      );
      if (!covered) {
        missingAffected.push(aff);
      }
    }

    results.push({ entry, missingAffected });
  }

  return results;
}
