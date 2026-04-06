import { createJiti } from 'jiti';
import * as Schema from 'effect/Schema';
import { isParseError } from 'effect/ParseResult';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  ConfigExportShapeError,
  ConfigNotFoundError,
  ConfigValidationError,
} from './errors';
import type { FileLinkConfig, FileLinkEntry } from './schema';
import { FileLinksFileSchema } from './schema';

export type LoadedFileLinksConfig = {
  links: FileLinkEntry[];
  config: FileLinkConfig;
};

export type LoadFileLinksConfigOptions = {
  /** When set, load this file instead of walking upward for `filelinks.config.ts`. */
  readonly configPath?: string;
};

const decodeFileLinksFile = Schema.decodeUnknownSync(FileLinksFileSchema);

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

function loadFileLinksConfigFromFile(file: string): LoadedFileLinksConfig {
  const jiti = createJiti(__filename);
  const loaded = jiti(file) as { default?: unknown };
  const exported = loaded.default;

  if (!exported || typeof exported !== 'object' || Array.isArray(exported)) {
    throw new ConfigExportShapeError(
      `Config file must default-export a non-array object (got ${typeof exported})`,
    );
  }

  const value = exported as Record<string, unknown>;
  const linksRaw = value['links'];
  const configRaw = value['config'];
  if (!Array.isArray(linksRaw)) {
    throw new ConfigExportShapeError(
      'Config default export must include a links array',
    );
  }
  if (!configRaw || typeof configRaw !== 'object' || Array.isArray(configRaw)) {
    throw new ConfigExportShapeError(
      'Config default export must include a config object',
    );
  }

  try {
    const decoded = decodeFileLinksFile(exported);
    return {
      links: [...decoded.links],
      config: { ...decoded.config },
    };
  } catch (e: unknown) {
    if (isParseError(e)) {
      throw new ConfigValidationError('Config file failed schema validation', {
        cause: e,
      });
    }
    throw e;
  }
}

/**
 * Load `filelinks.config.ts` by walking up from `startDir`, or an explicit path via `options.configPath`.
 */
export function loadFileLinksConfig(
  startDir: string,
  options?: LoadFileLinksConfigOptions,
): LoadedFileLinksConfig {
  const resolvedStart = path.resolve(startDir);

  let file: string | null;
  if (options?.configPath !== undefined && options.configPath !== '') {
    const p = options.configPath;
    file = path.isAbsolute(p) ? p : path.resolve(resolvedStart, p);
    if (!fs.existsSync(file)) {
      throw new ConfigNotFoundError(`Config file not found: ${file}`);
    }
  } else {
    file = findConfigFile(resolvedStart);
    if (!file) {
      throw new ConfigNotFoundError(
        `filelinks.config.ts not found when searching upward from ${resolvedStart}`,
      );
    }
  }

  return loadFileLinksConfigFromFile(file);
}
