import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CURSOR_API_KEY_ENV_NAME = 'CURSOR_API_KEY';

export type ResolveCursorApiKeyOptions = {
  cwd: string;
  /** CLI flag override (highest precedence). */
  cursorApiKey?: string;
};

function unwrapEnvValue(rawValue: string): string {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) {
    return value.trim();
  }
  return value.slice(0, hashIndex).trim();
}

function readCursorApiKeyFromEnvFile(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const text = readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^(?:export\s+)?CURSOR_API_KEY\s*=\s*(.*)$/u);
    if (!match) {
      continue;
    }

    const parsed = unwrapEnvValue(match[1] ?? '');
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return undefined;
}

/** Resolve Cursor API key: flag > process.env > `.env.local` > `.env` under `cwd`. */
export function resolveCursorApiKey(
  opts: ResolveCursorApiKeyOptions,
): string | undefined {
  const flagApiKey = opts.cursorApiKey?.trim();
  if (flagApiKey) {
    return flagApiKey;
  }

  const envApiKey = process.env[CURSOR_API_KEY_ENV_NAME]?.trim();
  if (envApiKey) {
    return envApiKey;
  }

  const envLocalApiKey = readCursorApiKeyFromEnvFile(
    join(opts.cwd, '.env.local'),
  );
  if (envLocalApiKey) {
    return envLocalApiKey;
  }

  return readCursorApiKeyFromEnvFile(join(opts.cwd, '.env'));
}
