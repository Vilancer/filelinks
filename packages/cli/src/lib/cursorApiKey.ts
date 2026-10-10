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
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const end = value.indexOf(quote, 1);
    if (end !== -1) {
      return value.slice(1, end).trim();
    }
  }
  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) {
    return value.trim();
  }
  return value.slice(0, hashIndex).trim();
}

/** First non-empty `NAME=value` for `envName` in a dotenv-style file. */
export function readEnvValueFromFile(
  filePath: string,
  envName: string,
): string | undefined {
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
    const match = trimmed.match(
      new RegExp(`^(?:export\\s+)?${envName}\\s*=\\s*(.*)$`, 'u'),
    );
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

  const envLocalApiKey = readEnvValueFromFile(
    join(opts.cwd, '.env.local'),
    CURSOR_API_KEY_ENV_NAME,
  );
  if (envLocalApiKey) {
    return envLocalApiKey;
  }

  return readEnvValueFromFile(join(opts.cwd, '.env'), CURSOR_API_KEY_ENV_NAME);
}
