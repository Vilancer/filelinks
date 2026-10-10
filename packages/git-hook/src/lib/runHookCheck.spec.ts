import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCli = vi.hoisted(() => ({
  runCli: vi.fn(),
}));

vi.mock('@vilancer/filelinks', () => ({
  runCli: mockCli.runCli,
}));

import { buildCheckArgv, runHookCheck } from './runHookCheck.js';

describe('buildCheckArgv', () => {
  it('defaults to `filelinks check`', () => {
    expect(buildCheckArgv()).toEqual(['node', 'filelinks', 'check']);
  });

  it('puts global options before `check` and --run-agents after', () => {
    expect(
      buildCheckArgv({
        cwd: '/repo',
        config: 'filelinks.config.ts',
        json: true,
        runAgents: true,
      }),
    ).toEqual([
      'node',
      'filelinks',
      '--cwd',
      '/repo',
      '--config',
      'filelinks.config.ts',
      '--json',
      'check',
      '--run-agents',
    ]);
  });

  it('passes --stage-fixes only together with --run-agents', () => {
    expect(buildCheckArgv({ runAgents: true, stageFixes: true })).toEqual([
      'node',
      'filelinks',
      'check',
      '--run-agents',
      '--stage-fixes',
    ]);
    expect(buildCheckArgv({ stageFixes: true })).toEqual([
      'node',
      'filelinks',
      'check',
    ]);
  });
});

describe('runHookCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it('delegates to runCli and propagates its exit code', async () => {
    mockCli.runCli.mockImplementation(async () => {
      process.exitCode = 1;
    });
    const code = await runHookCheck({ cwd: '/repo', runAgents: true, env: {} });
    expect(mockCli.runCli).toHaveBeenCalledWith([
      'node',
      'filelinks',
      '--cwd',
      '/repo',
      'check',
      '--run-agents',
    ]);
    expect(code).toBe(1);
    expect(process.exitCode).toBe(1);
  });

  it('returns 0 when runCli succeeds', async () => {
    mockCli.runCli.mockResolvedValue(undefined);
    expect(await runHookCheck({ env: {} })).toBe(0);
    expect(mockCli.runCli).toHaveBeenCalledWith(['node', 'filelinks', 'check']);
  });

  it('short-circuits with exit 0 when FILELINKS_SKIP=1', async () => {
    const writeErr = vi.fn();
    const code = await runHookCheck({
      env: { FILELINKS_SKIP: '1' },
      writeErr,
    });
    expect(code).toBe(0);
    expect(process.exitCode).toBe(0);
    expect(mockCli.runCli).not.toHaveBeenCalled();
    expect(writeErr).toHaveBeenCalledWith(
      expect.stringContaining('FILELINKS_SKIP=1'),
    );
  });
});
