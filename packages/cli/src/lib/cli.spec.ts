import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCore = vi.hoisted(() => ({
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
  matchStagedLinks: vi.fn(),
}));

vi.mock('@vilancer/filelinks-core', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@vilancer/filelinks-core')>();
  return {
    ...actual,
    loadFileLinksConfig: mockCore.loadFileLinksConfig,
    getStagedFilePaths: mockCore.getStagedFilePaths,
    matchStagedLinks: mockCore.matchStagedLinks,
  };
});

import { runCheck } from './runCheck.js';
import { runList } from './runList.js';
import { readVersion } from './cli.js';

describe('readVersion', () => {
  it('reads version from @vilancer/filelinks package.json', () => {
    const version = readVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(version).not.toBe('0.0.0');
  });
});

describe('runCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits 0 when severity omitted and only warn-level violations', async () => {
    mockCore.getStagedFilePaths.mockReturnValue(['apps/foo.ts']);
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [
        {
          trigger: 'apps/**/*.ts',
          affects: [{ file: 'docs/x.md', reason: 'sync' }],
        },
      ],
      config: {},
    });
    mockCore.matchStagedLinks.mockReturnValue([
      {
        entry: {
          trigger: 'apps/**/*.ts',
          affects: [{ file: 'docs/x.md', reason: 'sync' }],
        },
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);

    const code = await runCheck({
      cwd: '/repo',
      json: false,
    });
    expect(code).toBe(0);
  });

  it('exits 1 when violation has severity error', async () => {
    mockCore.getStagedFilePaths.mockReturnValue(['apps/foo.ts']);
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [
        {
          trigger: 'apps/**/*.ts',
          severity: 'error',
          affects: [{ file: 'docs/x.md', reason: 'sync' }],
        },
      ],
      config: {},
    });
    mockCore.matchStagedLinks.mockReturnValue([
      {
        entry: {
          trigger: 'apps/**/*.ts',
          severity: 'error',
          affects: [{ file: 'docs/x.md', reason: 'sync' }],
        },
        missingAffected: [{ file: 'docs/x.md', reason: 'sync' }],
      },
    ]);

    const code = await runCheck({ cwd: '/repo', json: false });
    expect(code).toBe(1);
  });
});

describe('runList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits two data rows for one entry with two affects', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [
        {
          trigger: 't',
          affects: [
            { file: 'a', reason: 'r1' },
            { file: 'b', reason: 'r2' },
          ],
        },
      ],
      config: {},
    });

    const code = runList({ cwd: '/repo', json: false });
    expect(code).toBe(0);
    const lines = log.mock.calls.map((c) => String(c[0]));
    const dataRows = lines.slice(1);
    expect(dataRows.length).toBe(2);
    expect(dataRows[0]).toContain('t');
    expect(dataRows[0]).toContain('a');
    expect(dataRows[1]).toContain('t');
    expect(dataRows[1]).toContain('b');
    log.mockRestore();
  });
});
