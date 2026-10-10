import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  resolveAgentCredential,
  resolveClaudeToken,
} from './agentCredentials.js';

const ENV_NAMES = [
  'CLAUDE_CODE_OAUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'CURSOR_API_KEY',
];

describe('resolveClaudeToken', () => {
  const saved: Record<string, string | undefined> = {};
  let dir: string;

  beforeEach(() => {
    for (const name of ENV_NAMES) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
    dir = mkdtempSync(join(tmpdir(), 'filelinks-claude-token-'));
  });

  afterEach(() => {
    for (const name of ENV_NAMES) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('prefers the --claude-token flag', () => {
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'env-token';
    expect(resolveClaudeToken({ cwd: dir, claudeToken: ' flag-token ' })).toBe(
      'flag-token',
    );
  });

  it('prefers CLAUDE_CODE_OAUTH_TOKEN over ANTHROPIC_API_KEY in env', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-api-key';
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'oauth-token';
    expect(resolveClaudeToken({ cwd: dir })).toBe('oauth-token');
  });

  it('reads .env.local before .env', () => {
    writeFileSync(join(dir, '.env'), 'CLAUDE_CODE_OAUTH_TOKEN=from-env\n');
    writeFileSync(
      join(dir, '.env.local'),
      'export ANTHROPIC_API_KEY="from-env-local" # comment\n',
    );
    expect(resolveClaudeToken({ cwd: dir })).toBe('from-env-local');
  });

  it('returns undefined when nothing is configured', () => {
    expect(resolveClaudeToken({ cwd: dir })).toBeUndefined();
  });

  it('resolveAgentCredential dispatches per provider', () => {
    process.env['CURSOR_API_KEY'] = 'cursor-key';
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'claude-token';
    expect(resolveAgentCredential('cursor', { cwd: dir })).toBe('cursor-key');
    expect(resolveAgentCredential('claude', { cwd: dir })).toBe('claude-token');
  });
});
