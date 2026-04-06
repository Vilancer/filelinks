import * as fs from 'node:fs';
import * as path from 'node:path';

import { createElement } from 'react';
import { render } from 'ink';

import {
  defineLinks,
  findConfigFile,
  loadFileLinksConfig,
  normalizeError,
  type FileLinkConfig,
  type FileLinkEntry,
} from '@filelinks/core';

import { AddWizard } from './add-ui/AddWizard.js';
import { listPathCandidatesWithMeta } from './pathCandidates.js';

export function serializeFileLinksConfig(
  links: FileLinkEntry[],
  config: FileLinkConfig,
): string {
  const linksStr = JSON.stringify(links, null, 2);
  const configStr = JSON.stringify(config, null, 2);
  return `import { defineLinks } from '@filelinks/core';\n\nexport default defineLinks(\n${linksStr},\n${configStr},\n);\n`;
}

export type RunAddOpts = {
  cwd: string;
  configPath?: string;
  verbose: boolean;
  /** When true, refuse (D-24) — `add` is interactive only. */
  json?: boolean;
};

async function commitEntry(
  opts: RunAddOpts,
  entry: FileLinkEntry,
): Promise<number> {
  const decoded = defineLinks([entry], {});
  const row = decoded.links[0];
  if (row === undefined) {
    console.error('defineLinks returned no entries');
    return 1;
  }

  let targetPath: string;
  if (opts.configPath) {
    targetPath = path.isAbsolute(opts.configPath)
      ? opts.configPath
      : path.resolve(opts.cwd, opts.configPath);
  } else {
    const found = findConfigFile(opts.cwd);
    targetPath =
      found ?? path.join(path.resolve(opts.cwd), 'filelinks.config.ts');
  }

  if (!fs.existsSync(targetPath)) {
    const merged = defineLinks([row], {});
    fs.writeFileSync(
      targetPath,
      serializeFileLinksConfig(merged.links, merged.config),
      'utf8',
    );
    console.log(`Created ${targetPath}`);
    return 0;
  }

  const loaded = loadFileLinksConfig(path.dirname(targetPath), {
    configPath: path.basename(targetPath),
  });
  const mergedLinks = [...loaded.links, row];
  const merged = defineLinks(mergedLinks, loaded.config);
  fs.writeFileSync(
    targetPath,
    serializeFileLinksConfig(merged.links, merged.config),
    'utf8',
  );
  console.log(`Updated ${targetPath}`);
  return 0;
}

function exitCodeNumber(): number {
  const c = process.exitCode;
  return typeof c === 'number' ? c : 0;
}

export async function runAdd(opts: RunAddOpts): Promise<number> {
  if (opts.json) {
    console.error('filelinks add is interactive only; omit --json to run add.');
    return 1;
  }

  try {
    const { waitUntilExit } = render(
      createElement(AddWizard, {
        loadCandidates: async () => {
          const { candidates, directories } = listPathCandidatesWithMeta(
            opts.cwd,
          );
          if (candidates.length === 0) {
            throw new Error(
              'filelinks add: no paths found to choose from (empty tree or cwd).',
            );
          }
          return { candidates, directories: [...directories] };
        },
        onCommit: async (entry: FileLinkEntry) => {
          try {
            return await commitEntry(opts, entry);
          } catch (e: unknown) {
            const h = normalizeError(e);
            console.error(h.message);
            return 1;
          }
        },
      }),
    );
    await waitUntilExit();
    return exitCodeNumber();
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  }
}
