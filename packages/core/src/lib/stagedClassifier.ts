import { minimatch } from 'minimatch';

import { stagedCoversAffected } from './linkMatcher';
import type { AffectedFile, FileLinkEntry } from './schema';

export interface StagedLinkCoverage {
  entry: FileLinkEntry;
  triggerMatched: boolean;
  affectMatched: boolean;
  triggerPaths: string[];
  affectPaths: string[];
  missingAffected: AffectedFile[];
}

export function classifyStagedLinks(
  stagedPaths: string[],
  links: FileLinkEntry[],
): StagedLinkCoverage[] {
  return links.map((entry) => {
    const triggerPaths = stagedPaths.filter((p) => minimatch(p, entry.trigger));
    const triggerMatched = triggerPaths.length > 0;

    const affectPathSet = new Set<string>();
    for (const aff of entry.affects) {
      for (const p of stagedPaths) {
        if (stagedCoversAffected([p], aff.file, entry.linkType)) {
          affectPathSet.add(p);
        }
      }
    }
    const affectPaths = [...affectPathSet];
    const affectMatched = affectPaths.length > 0;
    const inPlay = triggerMatched || affectMatched;

    if (!inPlay) {
      return {
        entry,
        triggerMatched: false,
        affectMatched: false,
        triggerPaths: [],
        affectPaths: [],
        missingAffected: [],
      };
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

    return {
      entry,
      triggerMatched,
      affectMatched,
      triggerPaths,
      affectPaths,
      missingAffected,
    };
  });
}
