import {
  loadFileLinksConfig,
  normalizeError,
  type FileLinkEntry,
} from '@filelinks/core';

import type { ListRowJson } from './formatters';
import { printListJson } from './formatters';

export type RunListOpts = {
  cwd: string;
  configPath?: string;
  json: boolean;
};

function effectiveSeverity(entry: FileLinkEntry): 'warn' | 'error' {
  return entry.severity ?? 'warn';
}

export function runList(opts: RunListOpts): number {
  let links;
  try {
    const loaded = loadFileLinksConfig(
      opts.cwd,
      opts.configPath ? { configPath: opts.configPath } : undefined,
    );
    links = loaded.links;
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }

  const rows: ListRowJson[] = [];
  for (const entry of links) {
    const sev = effectiveSeverity(entry);
    const lt = entry.linkType ?? null;
    for (const aff of entry.affects) {
      rows.push({
        trigger: entry.trigger,
        affectedFile: aff.file,
        reason: aff.reason,
        severity: sev,
        linkType: lt,
      });
    }
  }

  if (opts.json) {
    printListJson(rows);
  } else {
    const headers = ['Trigger', 'Affected', 'Reason', 'Severity', 'linkType'];
    console.log(headers.join('\t'));
    for (const r of rows) {
      const linkCol = r.linkType === null ? '—' : r.linkType;
      console.log(
        [r.trigger, r.affectedFile, r.reason, r.severity, linkCol].join('\t'),
      );
    }
  }

  return 0;
}
