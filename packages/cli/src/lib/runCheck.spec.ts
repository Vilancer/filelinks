import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  let tempDirs: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['CURSOR_API_KEY'] = 'env-default-key';
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
    delete process.env['CURSOR_API_KEY'];
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
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

  it('uses --cursor-api-key over CURSOR_API_KEY', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);

    const code = await runCheck({
      cwd: '/repo',
      json: false,
      runAgents: true,
      cursorApiKey: 'flag-key',
    });

    expect(code).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'flag-key' },
      }),
    );
  });

  it('uses CURSOR_API_KEY when --cursor-api-key is missing', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    process.env['CURSOR_API_KEY'] = 'env-key';

    const code = await runCheck({
      cwd: '/repo',
      json: false,
      runAgents: true,
    });

    expect(code).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'env-key' },
      }),
    );
  });

  it('uses .env when flag and env are missing', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    delete process.env['CURSOR_API_KEY'];
    const tempDir = mkdtempSync(join(tmpdir(), 'filelinks-runcheck-'));
    tempDirs.push(tempDir);
    writeFileSync(join(tempDir, '.env'), 'CURSOR_API_KEY=dotenv-key\n');

    const code = await runCheck({
      cwd: tempDir,
      json: false,
      runAgents: true,
    });

    expect(code).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'dotenv-key' },
      }),
    );
  });

  it('prints actionable diagnostics when key is unresolved', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    delete process.env['CURSOR_API_KEY'];
    const tempDir = mkdtempSync(join(tmpdir(), 'filelinks-runcheck-'));
    tempDirs.push(tempDir);

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const code = await runCheck({
      cwd: tempDir,
      json: false,
      runAgents: true,
    });

    expect(code).toBe(1);
    expect(mockRun).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('--cursor-api-key'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('CURSOR_API_KEY'),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('.env'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--cwd'));

    errorSpy.mockRestore();
  });

  it('JSON output includes agentRuns when runAgents true', async () => {
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['apps/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.shouldRunAgentForLink.mockReturnValue(true);

    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const code = await runCheck({
      cwd: '/repo',
      json: true,
      runAgents: true,
    });

    expect(code).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      violations: unknown[];
      agentRuns?: { trigger: string; status: string }[];
    };
    expect(payload.violations).toEqual([]);
    expect(payload.agentRuns).toEqual([
      { trigger: 'apps/**/*.ts', status: 'ok', runId: 'run-1' },
    ]);

    log.mockRestore();
  });
});
