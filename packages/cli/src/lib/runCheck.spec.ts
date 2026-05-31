import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRun = vi.fn();

const mockCore = vi.hoisted(() => ({
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
  matchStagedLinks: vi.fn(),
  classifyStagedLinks: vi.fn(),
  resolveAgentRunPolicy: vi.fn(),
  shouldRunAgentForLink: vi.fn(),
  resolvePrompt: vi.fn(),
  resolveAgentConfig: vi.fn(),
  getStagedDiffForPaths: vi.fn(),
  readAffectedContents: vi.fn(),
  buildAgentPrompt: vi.fn(),
  getAgentProvider: vi.fn(),
  normalizeError: vi.fn((e: unknown) => ({
    message: e instanceof Error ? e.message : String(e),
    exitCode: 1 as const,
  })),
}));

vi.mock('@filelinks/core', () => ({
  ...mockCore,
}));

import { runCheck } from './runCheck.js';

describe('runCheck agent orchestration', () => {
  const entry = {
    trigger: 'apps/**/*.ts',
    affects: [{ file: 'docs/x.md', reason: 'sync' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({ status: 'finished', runId: 'run-1' });
    mockCore.getAgentProvider.mockReturnValue({ run: mockRun });
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [entry],
      config: { agent: { provider: 'cursor' } },
    });
    mockCore.getStagedFilePaths.mockReturnValue(['apps/foo.ts']);
    mockCore.resolveAgentRunPolicy.mockReturnValue('trigger-or-affects');
    mockCore.resolvePrompt.mockReturnValue({ systemPrompt: 'test' });
    mockCore.resolveAgentConfig.mockReturnValue({
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
    });
    mockCore.getStagedDiffForPaths.mockReturnValue('');
    mockCore.readAffectedContents.mockReturnValue([]);
    mockCore.buildAgentPrompt.mockReturnValue('prompt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CLI-06: runs agent when trigger matched and missingAffected non-empty', async () => {
    mockCore.matchStagedLinks.mockReturnValue([
      {
        entry,
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);

    const code = await runCheck({
      cwd: '/repo',
      json: false,
      runAgents: true,
    });

    expect(code).toBe(0);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('D-06: runs agent when matchStagedLinks empty but classify eligible (affect-only)', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: false,
        affectMatched: true,
        triggerPaths: [],
        affectPaths: ['docs/x.md'],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);

    const code = await runCheck({
      cwd: '/repo',
      json: false,
      runAgents: true,
    });

    expect(code).toBe(0);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('returns 1 when warn violations and provider.run rejects', async () => {
    mockCore.matchStagedLinks.mockReturnValue([
      {
        entry,
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    mockRun.mockRejectedValue(new Error('agent failed'));

    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const code = await runCheck({
      cwd: '/repo',
      json: false,
      runAgents: true,
    });

    expect(code).toBe(1);
    expect(mockRun).toHaveBeenCalledTimes(1);

    err.mockRestore();
    log.mockRestore();
  });
});
