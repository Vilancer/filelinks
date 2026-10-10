import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedAgentConfig } from '../agentConfigResolver';
import {
  AgentConfigError,
  AgentMissingApiKeyError,
  AgentRunFailedError,
  AgentStartupError,
} from '../errors';
import {
  buildClaudeEnv,
  buildClaudeQueryOptions,
  createClaudeAgentProvider,
  type ClaudeAgentSdk,
} from './claudeProvider';

const deviceConfig: ResolvedAgentConfig = {
  provider: 'claude',
  runtime: 'local',
  model: 'claude-opus-5-5',
  local: { cwd: '/tmp/repo' },
};

const tokenConfig: ResolvedAgentConfig = {
  ...deviceConfig,
  claude: { auth: 'token' },
};

function successResult(result = 'done') {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    result,
    session_id: 'sess-1',
  };
}

function fakeSdk(messages: unknown[] | (() => never)) {
  const query = vi.fn(() => {
    if (typeof messages === 'function') {
      return messages();
    }
    return (async function* () {
      for (const m of messages) {
        yield m;
      }
    })();
  });
  return {
    query,
    sdk: { query } as unknown as ClaudeAgentSdk,
  };
}

const ENV_NAMES = ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'];

describe('claudeAgentProvider', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const name of ENV_NAMES) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of ENV_NAMES) {
      if (saved[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved[name];
      }
    }
  });

  describe('buildClaudeEnv', () => {
    it('device auth inherits the environment (undefined env)', () => {
      expect(buildClaudeEnv('device', {})).toBeUndefined();
    });

    it('token auth throws AgentMissingApiKeyError without a token', () => {
      expect(() => buildClaudeEnv('token', {})).toThrow(
        AgentMissingApiKeyError,
      );
    });

    it('routes setup tokens to CLAUDE_CODE_OAUTH_TOKEN and drops ANTHROPIC_API_KEY', () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-api-stale';
      const env = buildClaudeEnv('token', { apiKey: 'sk-ant-oat01-abc' });
      expect(env?.['CLAUDE_CODE_OAUTH_TOKEN']).toBe('sk-ant-oat01-abc');
      expect(env?.['ANTHROPIC_API_KEY']).toBeUndefined();
    });

    it('routes API keys to ANTHROPIC_API_KEY', () => {
      const env = buildClaudeEnv('token', { apiKey: 'sk-ant-api03-xyz' });
      expect(env?.['ANTHROPIC_API_KEY']).toBe('sk-ant-api03-xyz');
      expect(env?.['CLAUDE_CODE_OAUTH_TOKEN']).toBeUndefined();
    });

    it('falls back to CLAUDE_CODE_OAUTH_TOKEN from process.env', () => {
      process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'sk-ant-oat01-env';
      expect(buildClaudeEnv('token', {})?.['CLAUDE_CODE_OAUTH_TOKEN']).toBe(
        'sk-ant-oat01-env',
      );
    });
  });

  describe('buildClaudeQueryOptions', () => {
    it('edit mode allows read + edit tools only, without prompts', () => {
      const o = buildClaudeQueryOptions(deviceConfig, {}, 'edit');
      expect(o.tools).toEqual(['Read', 'Glob', 'Grep', 'Edit', 'Write']);
      expect(o.allowedTools).toEqual(o.tools);
      expect(o.permissionMode).toBe('dontAsk');
      expect(o.cwd).toBe('/tmp/repo');
      expect(o.model).toBe('claude-opus-5-5');
      expect(o.settingSources).toEqual(['user', 'project', 'local']);
      expect(o.env).toBeUndefined();
    });

    it('suggest mode is read-only', () => {
      const o = buildClaudeQueryOptions(deviceConfig, {}, 'suggest');
      expect(o.tools).toEqual(['Read', 'Glob', 'Grep']);
      expect(o.tools).not.toContain('Edit');
      expect(o.tools).not.toContain('Bash');
    });

    it('token auth skips user settings and injects the token', () => {
      const o = buildClaudeQueryOptions(
        tokenConfig,
        { apiKey: 'sk-ant-oat01-abc' },
        'edit',
      );
      expect(o.settingSources).toEqual(['project', 'local']);
      expect(o.env?.['CLAUDE_CODE_OAUTH_TOKEN']).toBe('sk-ant-oat01-abc');
    });

    it('maps modelParams effort and rejects unknown values', () => {
      const withEffort = {
        ...deviceConfig,
        modelParams: [{ id: 'effort', value: 'high' }],
      };
      expect(buildClaudeQueryOptions(withEffort, {}, 'edit').effort).toBe(
        'high',
      );
      expect(() =>
        buildClaudeQueryOptions(
          { ...deviceConfig, modelParams: [{ id: 'effort', value: 'huge' }] },
          {},
          'edit',
        ),
      ).toThrow(AgentConfigError);
    });

    it('rejects cloud runtime', () => {
      expect(() =>
        buildClaudeQueryOptions(
          {
            provider: 'claude',
            runtime: 'cloud',
            model: 'claude-opus-5-5',
            cloud: { repos: ['org/repo'] },
          },
          {},
          'edit',
        ),
      ).toThrow(AgentConfigError);
    });
  });

  describe('run', () => {
    it('returns the result text and session id on success', async () => {
      const { sdk, query } = fakeSdk([
        { type: 'system', subtype: 'init' },
        successResult('suggested diff'),
      ]);
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });

      const result = await provider.run({
        prompt: 'p',
        config: deviceConfig,
        mode: 'suggest',
      });

      expect(result).toEqual({
        status: 'finished',
        runId: 'sess-1',
        resultText: 'suggested diff',
      });
      const [[params]] = query.mock.calls as unknown as [
        [{ prompt: string; options: { tools: string[] } }],
      ];
      expect(params.prompt).toBe('p');
      expect(params.options.tools).toEqual(['Read', 'Glob', 'Grep']);
    });

    it('throws AgentRunFailedError for error results', async () => {
      const { sdk } = fakeSdk([
        {
          type: 'result',
          subtype: 'error_max_turns',
          is_error: true,
          errors: ['too many turns'],
          session_id: 'sess-2',
        },
      ]);
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });
      await expect(
        provider.run({ prompt: 'p', config: deviceConfig }),
      ).rejects.toThrow(/error_max_turns: too many turns \(runId: sess-2\)/);
    });

    it('throws AgentRunFailedError when a success result is flagged is_error (e.g. auth)', async () => {
      const { sdk } = fakeSdk([
        { ...successResult('Invalid API key'), is_error: true },
      ]);
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });
      await expect(
        provider.run({ prompt: 'p', config: deviceConfig }),
      ).rejects.toBeInstanceOf(AgentRunFailedError);
    });

    it('throws AgentRunFailedError when the stream ends without a result', async () => {
      const { sdk } = fakeSdk([{ type: 'system', subtype: 'init' }]);
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });
      await expect(
        provider.run({ prompt: 'p', config: deviceConfig }),
      ).rejects.toBeInstanceOf(AgentRunFailedError);
    });

    it('maps SDK failures to AgentStartupError with an auth hint', async () => {
      const { sdk } = fakeSdk(() => {
        throw new Error('spawn claude ENOENT');
      });
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });
      const err = await provider
        .run({ prompt: 'p', config: deviceConfig })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AgentStartupError);
      expect((err as Error).message).toMatch(
        /spawn claude ENOENT.*setup-token/,
      );
    });

    it('fails fast with AgentMissingApiKeyError for token auth without a token', async () => {
      const { sdk, query } = fakeSdk([successResult()]);
      const provider = createClaudeAgentProvider({ loadSdk: async () => sdk });
      await expect(
        provider.run({ prompt: 'p', config: tokenConfig }),
      ).rejects.toBeInstanceOf(AgentMissingApiKeyError);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('validateCredentials', () => {
    const provider = createClaudeAgentProvider({
      loadSdk: async () => fakeSdk([]).sdk,
    });

    it('accepts device auth without a token', () => {
      expect(() =>
        provider.validateCredentials({}, deviceConfig),
      ).not.toThrow();
    });

    it('requires a token for token auth', () => {
      expect(() => provider.validateCredentials({}, tokenConfig)).toThrow(
        AgentMissingApiKeyError,
      );
      expect(() =>
        provider.validateCredentials({ apiKey: 'sk-ant-oat01-x' }, tokenConfig),
      ).not.toThrow();
    });
  });

  describe('listModels', () => {
    it('maps supportedModels and closes the query', async () => {
      const close = vi.fn();
      const query = vi.fn(() => ({
        supportedModels: async () => [
          {
            value: 'claude-opus-5-5',
            displayName: 'Opus 5.5',
            description: '',
          },
          { value: 'sonnet', displayName: 'Sonnet', description: '' },
        ],
        close,
      }));
      const provider = createClaudeAgentProvider({
        loadSdk: async () => ({ query }) as unknown as ClaudeAgentSdk,
      });

      const models = await provider.listModels({});

      expect(models).toEqual([
        { id: 'claude-opus-5-5', label: 'Opus 5.5', key: 'claude-opus-5-5' },
        { id: 'sonnet', label: 'Sonnet', key: 'sonnet' },
      ]);
      expect(close).toHaveBeenCalledOnce();
    });
  });
});
