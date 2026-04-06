import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCore = vi.hoisted(() => ({
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
  matchStagedLinks: vi.fn(),
}));

vi.mock('@filelinks/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@filelinks/core')>();
  return {
    ...actual,
    loadFileLinksConfig: mockCore.loadFileLinksConfig,
    getStagedFilePaths: mockCore.getStagedFilePaths,
    matchStagedLinks: mockCore.matchStagedLinks,
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

  it('passes global options to check and exits 0', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runCli([
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

  it('passes global options to list and exits 0', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    runCli([
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
