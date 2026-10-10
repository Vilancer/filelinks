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

/**
 * First non-empty credential: the flag, then each of `names` in `process.env`, then in
 * `.env.local`, then in `.env` under `cwd`.
 */
export function resolveCredential(opts: {
  cwd: string;
  flag?: string;
  names: readonly string[];
}): string | undefined {
  const flag = opts.flag?.trim();
  if (flag) {
    return flag;
  }
  for (const name of opts.names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  for (const file of ['.env.local', '.env']) {
    for (const name of opts.names) {
      const value = readEnvValueFromFile(join(opts.cwd, file), name);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

/** Resolve Cursor API key: flag > process.env > `.env.local` > `.env` under `cwd`. */
export function resolveCursorApiKey(
  opts: ResolveCursorApiKeyOptions,
): string | undefined {
  return resolveCredential({
    cwd: opts.cwd,
    flag: opts.cursorApiKey,
    names: [CURSOR_API_KEY_ENV_NAME],
  });
}
