import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedAgentConfig } from '../agentConfigResolver';
import {
  AgentMissingApiKeyError,
  AgentRunFailedError,
  AgentStartupError,
} from '../errors';
import { cursorAgentProvider } from './cursorProvider';

const mockModelsList = vi.fn();
const mockAgentCreate = vi.fn();
const mockSend = vi.fn();
const mockWait = vi.fn();
const mockAsyncDispose = vi.fn();
const mockClose = vi.fn();

vi.mock('@cursor/sdk', () => {
  class MockCursorAgentError extends Error {
    readonly isRetryable: boolean;

    constructor(message: string, options?: { isRetryable?: boolean }) {
      super(message);
      this.name = 'CursorAgentError';
      this.isRetryable = options?.isRetryable ?? false;
    }
  }

  return {
    Cursor: {
      models: {
        list: (...args: unknown[]) => mockModelsList(...args),
      },
    },
    Agent: {
      create: (...args: unknown[]) => mockAgentCreate(...args),
    },
    CursorAgentError: MockCursorAgentError,
  };
});

const localConfig: ResolvedAgentConfig = {
  provider: 'cursor',
  runtime: 'local',
  model: 'composer-2.5',
  local: { cwd: '/tmp/repo' },
};

const cloudConfig: ResolvedAgentConfig = {
  provider: 'cursor',
  runtime: 'cloud',
  model: 'composer-2.5',
  cloud: { repos: ['org/repo'] },
};

describe('cursorAgentProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['CURSOR_API_KEY'];

    mockModelsList.mockResolvedValue([{ id: 'composer-2.5', displayName: 'Composer 2.5' }]);
    mockWait.mockResolvedValue({
      id: 'run-1',
      status: 'finished',
      result: 'done',
    });
    mockSend.mockReturnValue({ wait: mockWait });
    mockAsyncDispose.mockResolvedValue(undefined);
    mockAgentCreate.mockResolvedValue({
      send: mockSend,
      close: mockClose,
      [Symbol.asyncDispose]: mockAsyncDispose,
    });
  });

  describe('validateCredentials and listModels', () => {
    it('throws AGENT_MISSING_API_KEY when env key is missing', () => {
      expect(() => cursorAgentProvider.validateCredentials({})).toThrow(
        AgentMissingApiKeyError,
      );
      expect(() => cursorAgentProvider.validateCredentials({})).toThrow(
        expect.objectContaining({ code: 'AGENT_MISSING_API_KEY' }),
      );
    });

    it('listModels returns mapped ids from Cursor.models.list', async () => {
      process.env['CURSOR_API_KEY'] = 'test-key';
      const models = await cursorAgentProvider.listModels({});
      expect(mockModelsList).toHaveBeenCalledWith({ apiKey: 'test-key' });
      expect(models).toEqual([
        { id: 'composer-2.5', label: 'Composer 2.5' },
      ]);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      process.env['CURSOR_API_KEY'] = 'test-key';
    });

    it('passes local cwd and settingSources for local runtime', async () => {
      await cursorAgentProvider.run({
        prompt: 'check sync',
        config: localConfig,
      });

      expect(mockAgentCreate).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: { id: 'composer-2.5' },
        local: { cwd: '/tmp/repo', settingSources: [] },
      });
      expect(mockAgentCreate.mock.calls[0][0]).not.toHaveProperty('cloud');
    });

    it('passes cloud repos without local for cloud runtime', async () => {
      await cursorAgentProvider.run({
        prompt: 'check sync',
        config: cloudConfig,
      });

      expect(mockAgentCreate).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: { id: 'composer-2.5' },
        cloud: {
          repos: [{ url: 'https://github.com/org/repo' }],
        },
      });
      expect(mockAgentCreate.mock.calls[0][0]).not.toHaveProperty('local');
    });

    it('throws AGENT_RUN_FAILED when result status is error', async () => {
      mockWait.mockResolvedValue({
        id: 'run-err',
        status: 'error',
      });

      await expect(
        cursorAgentProvider.run({ prompt: 'x', config: localConfig }),
      ).rejects.toMatchObject({
        code: 'AGENT_RUN_FAILED',
      });
      await expect(
        cursorAgentProvider.run({ prompt: 'x', config: localConfig }),
      ).rejects.toBeInstanceOf(AgentRunFailedError);
    });

    it('throws AGENT_STARTUP_FAILED for CursorAgentError', async () => {
      const { CursorAgentError } = await import('@cursor/sdk');
      mockAgentCreate.mockRejectedValue(
        new CursorAgentError('auth failed', { isRetryable: true }),
      );

      await expect(
        cursorAgentProvider.run({ prompt: 'x', config: localConfig }),
      ).rejects.toMatchObject({
        code: 'AGENT_STARTUP_FAILED',
        details: { isRetryable: true },
      });
      await expect(
        cursorAgentProvider.run({ prompt: 'x', config: localConfig }),
      ).rejects.toBeInstanceOf(AgentStartupError);
    });

    it('disposes the agent after a successful run', async () => {
      await cursorAgentProvider.run({
        prompt: 'ok',
        config: localConfig,
      });

      expect(mockAsyncDispose).toHaveBeenCalled();
    });
  });
});
