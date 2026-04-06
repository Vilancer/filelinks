import {
  loadFileLinksConfig,
  normalizeError,
  type FileLinkEntry,
} from '@filelinks/core';

import type { ListRowJson } from './formatters.js';
import { printListJson } from './formatters.js';

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
    const toCols = (r: ListRowJson): string[] => [
      r.trigger,
      r.affectedFile,
      r.reason,
      r.severity,
      r.linkType === null ? '—' : r.linkType,
    ];
    const allRows = rows.map(toCols);
    const widths = headers.map((h, i) =>
      Math.max(h.length, ...allRows.map((r) => r[i]?.length ?? 0)),
    );
    const pad = (v: string, i: number): string =>
      v.padEnd(widths[i] ?? v.length);
    const fmt = (cols: string[]): string => cols.map(pad).join('  ');

    console.log(fmt(headers));
    for (const r of rows) {
      console.log(fmt(toCols(r)));
    }
  }

  return 0;
}
