import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRun = vi.fn();

const mockCore = vi.hoisted(() => ({
  ANTHROPIC_API_KEY_ENV_NAME: 'ANTHROPIC_API_KEY',
  CLAUDE_OAUTH_TOKEN_ENV_NAME: 'CLAUDE_CODE_OAUTH_TOKEN',
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
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

vi.mock('@vilancer/filelinks-core', () => ({ ...mockCore }));

import { runSuggest } from './runSuggest.js';

describe('runSuggest', () => {
  const entry = {
    trigger: 'apps/**/*.ts',
    affects: [{ file: 'docs/x.md', reason: 'sync' }],
  };
  const coverage = {
    entry,
    triggerMatched: true,
    affectMatched: false,
    triggerPaths: ['apps/a.ts'],
    affectPaths: [],
    missingAffected: [],
  };
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockRun.mockResolvedValue({
      status: 'finished',
      runId: 'sess-1',
      resultText: 'docs/x.md: add the new field',
    });
    mockCore.getAgentProvider.mockReturnValue({ run: mockRun });
    mockCore.loadFileLinksConfig.mockReturnValue({
      links: [entry],
      config: {},
    });
    mockCore.getStagedFilePaths.mockReturnValue(['apps/a.ts']);
    mockCore.classifyStagedLinks.mockReturnValue([coverage]);
    mockCore.resolveAgentRunPolicy.mockReturnValue('trigger-only');
    mockCore.shouldRunAgentForLink.mockReturnValue(true);
    mockCore.resolvePrompt.mockReturnValue({});
    mockCore.resolveAgentConfig.mockReturnValue({
      provider: 'claude',
      runtime: 'local',
      model: 'claude-opus-5-5',
      local: { cwd: '.' },
    });
    mockCore.getStagedDiffForPaths.mockReturnValue('diff');
    mockCore.readAffectedContents.mockReturnValue([]);
    mockCore.buildAgentPrompt.mockReturnValue('prompt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the provider in suggest mode and prints the reply', async () => {
    const code = await runSuggest({ cwd: '/repo', json: false });

    expect(code).toBe(0);
    expect(mockCore.buildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'suggest' }),
    );
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'suggest', prompt: 'prompt' }),
    );
    const out = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(out).toContain('## apps/**/*.ts');
    expect(out).toContain('docs/x.md: add the new field');
  });

  it('prints suggestions JSON with --json', async () => {
    const code = await runSuggest({ cwd: '/repo', json: true });

    expect(code).toBe(0);
    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(payload).toEqual({
      suggestions: [
        {
          trigger: 'apps/**/*.ts',
          status: 'ok',
          runId: 'sess-1',
          suggestion: 'docs/x.md: add the new field',
        },
      ],
    });
  });

  it('passes --claude-token to the provider as ctx.apiKey', async () => {
    await runSuggest({ cwd: '/repo', json: true, claudeToken: 'tok' });
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ ctx: { apiKey: 'tok' } }),
    );
  });

  it('returns 1 and reports error status when the provider fails', async () => {
    mockRun.mockRejectedValue(new Error('boom'));
    const code = await runSuggest({ cwd: '/repo', json: true });
    expect(code).toBe(1);
    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0]));
    expect(payload.suggestions[0]).toEqual({
      trigger: 'apps/**/*.ts',
      status: 'error',
    });
  });

  it('prints a friendly line when nothing is eligible', async () => {
    mockCore.shouldRunAgentForLink.mockReturnValue(false);
    const code = await runSuggest({ cwd: '/repo', json: false });
    expect(code).toBe(0);
    expect(mockRun).not.toHaveBeenCalled();
    expect(String(logSpy.mock.calls[0]?.[0])).toMatch(/No staged changes/);
  });

  it('returns 1 when config fails to load', async () => {
    mockCore.loadFileLinksConfig.mockImplementation(() => {
      throw new Error('no config');
    });
    expect(await runSuggest({ cwd: '/repo', json: false })).toBe(1);
  });
});
