import {
  ANTHROPIC_API_KEY_ENV_NAME,
  CLAUDE_OAUTH_TOKEN_ENV_NAME,
  type AgentProviderId,
} from '@vilancer/filelinks-core';

import { resolveCredential, resolveCursorApiKey } from './cursorApiKey.js';

export type AgentCredentialFlags = {
  /** `--cursor-api-key` */
  cursorApiKey?: string;
  /** `--claude-token` (setup token or Anthropic API key) */
  claudeToken?: string;
};

export const CURSOR_API_KEY_MISSING_MESSAGE =
  'Cursor API key is required to run agents. Provide it via --cursor-api-key, CURSOR_API_KEY, or CURSOR_API_KEY in .env/.env.local at the --cwd repo root.';

/**
 * Claude token: flag > CLAUDE_CODE_OAUTH_TOKEN > ANTHROPIC_API_KEY (process env, then
 * `.env.local`, then `.env` under `cwd`). Only used when `agent.claude.auth` is `token`.
 */
export function resolveClaudeToken(opts: {
  cwd: string;
  claudeToken?: string;
}): string | undefined {
  return resolveCredential({
    cwd: opts.cwd,
    flag: opts.claudeToken,
    names: [CLAUDE_OAUTH_TOKEN_ENV_NAME, ANTHROPIC_API_KEY_ENV_NAME],
  });
}

/** Credential passed to the provider as `ctx.apiKey` (may be undefined; providers decide). */
export function resolveAgentCredential(
  provider: AgentProviderId,
  opts: { cwd: string } & AgentCredentialFlags,
): string | undefined {
  if (provider === 'cursor') {
    return resolveCursorApiKey({
      cwd: opts.cwd,
      cursorApiKey: opts.cursorApiKey,
    });
  }
  return resolveClaudeToken({ cwd: opts.cwd, claudeToken: opts.claudeToken });
}
