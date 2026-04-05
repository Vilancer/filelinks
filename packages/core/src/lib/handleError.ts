import { isParseError } from 'effect/ParseResult';

import { FilelinksError } from './errors';

export type HandledFailure = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Normalizes any thrown value into a structured failure object. Never throws.
 */
export function normalizeError(error: unknown): HandledFailure {
  if (error instanceof FilelinksError) {
    const details =
      error.cause !== undefined ? { cause: error.cause } : undefined;
    return {
      ok: false,
      code: error.code,
      message: error.message,
      ...(details !== undefined ? { details } : {}),
    };
  }

  if (isParseError(error)) {
    return {
      ok: false,
      code: 'CONFIG_VALIDATION',
      message: error.message,
      details: { parseError: error },
    };
  }

  if (error instanceof Error) {
    return {
      ok: false,
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    ok: false,
    code: 'UNKNOWN',
    message: typeof error === 'string' ? error : String(error),
  };
}
