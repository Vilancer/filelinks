import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mockRun = vi.hoisted(() => vi.fn());

const mockCore = vi.hoisted(() => ({
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
  matchStagedLinks: vi.fn(),
  classifyStagedLinks: vi.fn(),
  resolveAgentRunPolicy: vi.fn(),
  shouldRunAgentForLink: vi.fn(),
  resolveAgentConfig: vi.fn(),
  resolvePrompt: vi.fn(),
  getStagedDiffForPaths: vi.fn(),
  readAffectedContents: vi.fn(),
  buildAgentPrompt: vi.fn(),
  getAgentProvider: vi.fn(),
}));

vi.mock('@vilancer/filelinks-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@vilancer/filelinks-core')>();
  return {
    ...actual,
    loadFileLinksConfig: mockCore.loadFileLinksConfig,
    getStagedFilePaths: mockCore.getStagedFilePaths,
    matchStagedLinks: mockCore.matchStagedLinks,
    classifyStagedLinks: mockCore.classifyStagedLinks,
    resolveAgentRunPolicy: mockCore.resolveAgentRunPolicy,
    shouldRunAgentForLink: mockCore.shouldRunAgentForLink,
    resolveAgentConfig: mockCore.resolveAgentConfig,
    resolvePrompt: mockCore.resolvePrompt,
    getStagedDiffForPaths: mockCore.getStagedDiffForPaths,
    readAffectedContents: mockCore.readAffectedContents,
    buildAgentPrompt: mockCore.buildAgentPrompt,
    getAgentProvider: mockCore.getAgentProvider,
  };
});

import { runCli } from './cli.js';

describe('[e2e] cli command wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [],
      config: {},
    });
    mockCore.getStagedFilePaths.mockReturnValue([]);
    mockCore.matchStagedLinks.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes global options to check and exits 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/repo',
      '--config',
      'custom.config.ts',
      '--json',
      'check',
    ]);

    expect(mockCore.loadFileLinksConfig).toHaveBeenCalledWith('/tmp/repo', {
      configPath: 'custom.config.ts',
    });
    expect(mockCore.getStagedFilePaths).toHaveBeenCalledWith('/tmp/repo');
    expect(process.exitCode).toBe(0);

    log.mockRestore();
    err.mockRestore();
  });

  it('passes global options to list and exits 0', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/repo2',
      '--config',
      'nested/filelinks.config.ts',
      '--json',
      'list',
    ]);

    expect(mockCore.loadFileLinksConfig).toHaveBeenCalledWith('/tmp/repo2', {
      configPath: 'nested/filelinks.config.ts',
    });
    expect(process.exitCode).toBe(0);

    log.mockRestore();
    err.mockRestore();
  });
});

describe('[e2e] check --run-agents', () => {
  const entry = {
    trigger: 'src/**/*.ts',
    affects: [{ file: 'docs/x.md', reason: 'sync' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['CURSOR_API_KEY'] = 'env-default-key';
    process.exitCode = undefined;
    mockRun.mockResolvedValue({ runId: 'e2e-run' });
    mockCore.getAgentProvider.mockReturnValue({ run: mockRun });
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [entry],
      config: { agent: { provider: 'cursor' } },
    });
    mockCore.getStagedFilePaths.mockReturnValue(['src/foo.ts']);
    mockCore.matchStagedLinks.mockReturnValue([]);
    mockCore.classifyStagedLinks.mockReturnValue([
      {
        entry,
        triggerMatched: true,
        affectMatched: false,
        triggerPaths: ['src/foo.ts'],
        affectPaths: [],
        missingAffected: [],
      },
    ]);
    mockCore.resolveAgentRunPolicy.mockReturnValue('trigger-or-affects');
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    mockCore.resolvePrompt.mockReturnValue({ systemPrompt: 'e2e' });
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
  let tempDirs: string[] = [];

  it('wires --run-agents through check into agent provider', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/agent-fixture',
      'check',
      '--run-agents',
      '--cursor-api-key',
      'flag-e2e-key',
    ]);

    expect(mockCore.classifyStagedLinks).toHaveBeenCalled();
    expect(mockCore.getAgentProvider).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'flag-e2e-key' },
      }),
    );
    expect(process.exitCode).toBe(0);

    log.mockRestore();
    err.mockRestore();
  });

  it('emits agentRuns in JSON when --json --run-agents', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/agent-fixture',
      '--json',
      'check',
      '--run-agents',
      '--cursor-api-key',
      'flag-e2e-key',
    ]);

    expect(process.exitCode).toBe(0);
    expect(log).toHaveBeenCalled();
    const payload = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as {
      violations: unknown[];
      agentRuns?: { trigger: string }[];
    };
    expect(payload.agentRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: 'src/**/*.ts' }),
      ]),
    );

    log.mockRestore();
    err.mockRestore();
  });

  it('uses CURSOR_API_KEY when --cursor-api-key is absent', async () => {
    process.env['CURSOR_API_KEY'] = 'env-e2e-key';
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/agent-fixture',
      'check',
      '--run-agents',
    ]);

    expect(process.exitCode).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'env-e2e-key' },
      }),
    );

    log.mockRestore();
    err.mockRestore();
  });

  it('uses .env.local when flag and env are absent', async () => {
    delete process.env['CURSOR_API_KEY'];
    const tempDir = mkdtempSync(join(tmpdir(), 'filelinks-cli-e2e-'));
    tempDirs.push(tempDir);
    writeFileSync(join(tempDir, '.env.local'), 'CURSOR_API_KEY=dotenv-local\n');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      tempDir,
      'check',
      '--run-agents',
    ]);

    expect(process.exitCode).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ctx: { apiKey: 'dotenv-local' },
      }),
    );

    log.mockRestore();
    err.mockRestore();
  });

  it('prints missing-key guidance for check --run-agents', async () => {
    delete process.env['CURSOR_API_KEY'];
    const tempDir = mkdtempSync(join(tmpdir(), 'filelinks-cli-e2e-'));
    tempDirs.push(tempDir);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      tempDir,
      'check',
      '--run-agents',
    ]);

    expect(process.exitCode).toBe(1);
    expect(mockRun).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('--cursor-api-key'),
    );
    expect(err).toHaveBeenCalledWith(expect.stringContaining('CURSOR_API_KEY'));
    expect(err).toHaveBeenCalledWith(expect.stringContaining('.env'));
    expect(err).toHaveBeenCalledWith(expect.stringContaining('--cwd'));

    log.mockRestore();
    err.mockRestore();
  });
});
