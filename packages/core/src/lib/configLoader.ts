import { createJiti } from 'jiti';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { FileLinkConfig, FileLinkEntry } from './schema';

export type LoadedFileLinksConfig = {
  links: FileLinkEntry[];
  config: FileLinkConfig;
};

export function findConfigFile(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, 'filelinks.config.ts');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      break;
    }
    dir = path.dirname(dir);
  }

  return null;
}

export function loadFileLinksConfig(startDir: string): LoadedFileLinksConfig {
  const file = findConfigFile(startDir);
  if (!file) {
    throw new Error(
      `filelinks.config.ts not found when searching upward from ${path.resolve(startDir)}`
    );
  }

  const jiti = createJiti(__filename);
  const loaded = jiti(file) as { default?: unknown };
  const exported = loaded.default;

  if (!exported || typeof exported !== 'object' || Array.isArray(exported)) {
    throw new Error(
      `filelinks.config.ts must default-export a non-array object (got ${typeof exported})`
    );
  }

  const value = exported as Record<string, unknown>;
  const linksRaw = value['links'];
  const configRaw = value['config'];
  if (!Array.isArray(linksRaw)) {
    throw new Error(`filelinks.config.ts default export must include a links array`);
  }
  if (!configRaw || typeof configRaw !== 'object' || Array.isArray(configRaw)) {
    throw new Error(`filelinks.config.ts default export must include a config object`);
  }

  return {
    links: linksRaw as FileLinkEntry[],
    config: configRaw as FileLinkConfig,
  };
}
