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

function captureStdout(): { text: () => string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  return { text: () => chunks.join('') };
}

describe('[e2e] suggest, graph and claude wiring', () => {
  const entry = {
    trigger: 'src/**/*.ts',
    affects: [{ file: 'docs/api.md', reason: 'keep API docs in sync' }],
    severity: 'error' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    mockRun.mockResolvedValue({
      status: 'finished',
      runId: 'e2e-sess',
      resultText: 'docs/api.md: document the new route',
    });
    mockCore.getAgentProvider.mockReturnValue({ run: mockRun });
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [entry],
      config: {},
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
    mockCore.resolveAgentRunPolicy.mockReturnValue('trigger-only');
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    mockCore.resolvePrompt.mockReturnValue({});
    mockCore.resolveAgentConfig.mockReturnValue({
      provider: 'claude',
      runtime: 'local',
      model: 'claude-opus-5-5',
      local: { cwd: '.' },
      claude: { auth: 'token' },
    });
    mockCore.getStagedDiffForPaths.mockReturnValue('');
    mockCore.readAffectedContents.mockReturnValue([]);
    mockCore.buildAgentPrompt.mockReturnValue('prompt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suggest --json runs the provider read-only with --claude-token', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/suggest-fixture',
      '--json',
      'suggest',
      '--claude-token',
      'sk-ant-oat01-e2e',
    ]);

    expect(process.exitCode).toBe(0);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'suggest',
        ctx: { apiKey: 'sk-ant-oat01-e2e' },
      }),
    );
    const payload = JSON.parse(String(log.mock.calls.at(-1)?.[0])) as {
      suggestions: { suggestion?: string }[];
    };
    expect(payload.suggestions[0]?.suggestion).toBe(
      'docs/api.md: document the new route',
    );
  });

  it('check --run-agents passes --claude-token in edit mode', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli([
      'node',
      'filelinks',
      'check',
      '--run-agents',
      '--claude-token',
      'sk-ant-oat01-e2e',
    ]);

    expect(mockRun).toHaveBeenCalledTimes(1);
    const input = mockRun.mock.calls[0]?.[0] as {
      mode?: string;
      ctx: unknown;
    };
    expect(input.mode).toBeUndefined();
    expect(input.ctx).toEqual({ apiKey: 'sk-ant-oat01-e2e' });
  });

  it('graph --format dot prints a digraph from the loaded config', async () => {
    const out = captureStdout();

    await runCli([
      'node',
      'filelinks',
      '--cwd',
      '/tmp/graph-fixture',
      'graph',
      '--format',
      'dot',
    ]);

    expect(process.exitCode).toBe(0);
    expect(mockCore.loadFileLinksConfig).toHaveBeenCalledWith(
      '/tmp/graph-fixture',
      undefined,
    );
    expect(out.text()).toContain('digraph filelinks');
    expect(out.text()).toContain('docs/api.md');
  });

  it('graph --json emits the graph model', async () => {
    const out = captureStdout();

    await runCli(['node', 'filelinks', '--json', 'graph']);

    const payload = JSON.parse(out.text()) as {
      graph: { nodes: unknown[]; edges: unknown[] };
    };
    expect(payload.graph.nodes).toHaveLength(2);
    expect(payload.graph.edges).toHaveLength(1);
  });

  it('graph rejects unknown formats', async () => {
    const err = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);

    await runCli(['node', 'filelinks', 'graph', '--format', 'png']);

    expect(process.exitCode).toBe(1);
    err.mockRestore();
  });

  it('check --stage-fixes without --run-agents is rejected', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runCli(['node', 'filelinks', 'check', '--stage-fixes']);

    expect(process.exitCode).toBe(1);
    expect(err).toHaveBeenCalledWith('--stage-fixes requires --run-agents');
    expect(mockRun).not.toHaveBeenCalled();
  });
});
