import * as fs from 'node:fs';
import * as path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

import {
  defineLinks,
  findConfigFile,
  loadFileLinksConfig,
  normalizeError,
  type FileLinkConfig,
  type FileLinkEntry,
  type LinkType,
} from '@filelinks/core';

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
};

export async function runAdd(opts: RunAddOpts): Promise<number> {
  const rl = createInterface({ input, output });

  try {
    const trigger = (
      await rl.question('Trigger pattern (repo-relative glob): ')
    ).trim();
    if (!trigger) {
      console.error('Trigger is required.');
      return 1;
    }

    const affects: { file: string; reason: string }[] = [];
    while (true) {
      const file = (
        await rl.question('Affected file (empty to finish): ')
      ).trim();
      if (!file) {
        break;
      }
      const reason = (await rl.question('Reason: ')).trim();
      affects.push({ file, reason: reason || 'related' });
    }

    if (affects.length === 0) {
      console.error('At least one affected file is required.');
      return 1;
    }

    const sevRaw = (await rl.question('Severity (warn|error) [warn]: '))
      .trim()
      .toLowerCase();
    const severity: 'warn' | 'error' = sevRaw === 'error' ? 'error' : 'warn';

    const ltRaw = (
      await rl.question(
        'linkType (file-file|dir-dir|file-dir|dir-file, empty to skip): ',
      )
    ).trim();

    let linkType: LinkType | undefined;
    if (ltRaw) {
      const allowed: LinkType[] = [
        'file-file',
        'dir-dir',
        'file-dir',
        'dir-file',
      ];
      if (!allowed.includes(ltRaw as LinkType)) {
        console.error(`Invalid linkType: ${ltRaw}`);
        return 1;
      }
      linkType = ltRaw as LinkType;
    }

    const newEntry: FileLinkEntry = {
      trigger,
      affects,
      severity,
      ...(linkType !== undefined ? { linkType } : {}),
    };

    const decoded = defineLinks([newEntry], {});
    const entry = decoded.links[0];
    if (entry === undefined) {
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
      const merged = defineLinks([entry], {});
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
    const mergedLinks = [...loaded.links, entry];
    const merged = defineLinks(mergedLinks, loaded.config);
    fs.writeFileSync(
      targetPath,
      serializeFileLinksConfig(merged.links, merged.config),
      'utf8',
    );
    console.log(`Updated ${targetPath}`);
    return 0;
  } catch (e: unknown) {
    const h = normalizeError(e);
    console.error(h.message);
    return 1;
  } finally {
    rl.close();
  }
}
