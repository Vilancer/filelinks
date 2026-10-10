import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const graph = {
  hasStagedInfo: false,
  nodes: [
    { id: 'n0', path: 'a.ts', kind: 'trigger', isGlob: false },
    { id: 'n1', path: 'b.md', kind: 'affect', isGlob: false },
  ],
  edges: [
    {
      from: 'n0',
      to: 'n1',
      reason: 'sync',
      severity: 'warn',
      linkType: null,
      linkIndex: 0,
    },
  ],
};

const mockCore = vi.hoisted(() => ({
  loadFileLinksConfig: vi.fn(),
  getStagedFilePaths: vi.fn(),
  buildLinkGraph: vi.fn(),
  normalizeError: vi.fn((e: unknown) => ({
    message: e instanceof Error ? e.message : String(e),
    exitCode: 1 as const,
  })),
}));

vi.mock('@vilancer/filelinks-core', () => ({
  ...mockCore,
}));

import { GRAPH_FORMATS, runGraph } from './runGraph.js';

describe('runGraph', () => {
  const links = [
    { trigger: 'a.ts', affects: [{ file: 'b.md', reason: 'sync' }] },
  ];
  let tempDirs: string[] = [];
  let stdout: string[];
  let stderr: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockCore.loadFileLinksConfig.mockReturnValue({ links, config: {} });
    mockCore.getStagedFilePaths.mockReturnValue(['a.ts']);
    mockCore.buildLinkGraph.mockReturnValue(graph);
    stdout = [];
    stderr = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      stderr.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
    vi.restoreAllMocks();
  });

  it('exports GRAPH_FORMATS for commander choices', () => {
    expect(GRAPH_FORMATS).toEqual(['terminal', 'dot', 'mermaid', 'html']);
  });

  it('--json prints { graph }', () => {
    expect(runGraph({ cwd: '/repo', json: true })).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ graph });
    expect(mockCore.buildLinkGraph).toHaveBeenCalledWith(links, undefined);
    expect(mockCore.getStagedFilePaths).not.toHaveBeenCalled();
  });

  it('defaults to terminal format', () => {
    expect(runGraph({ cwd: '/repo', json: false })).toBe(0);
    expect(stdout.join('')).toContain('└─▶ b.md  [warn]  sync');
  });

  it('passes staged paths to buildLinkGraph with --staged', () => {
    runGraph({ cwd: '/repo', json: true, staged: true });
    expect(mockCore.getStagedFilePaths).toHaveBeenCalledWith('/repo');
    expect(mockCore.buildLinkGraph).toHaveBeenCalledWith(links, {
      staged: ['a.ts'],
    });
  });

  it('passes configPath through', () => {
    runGraph({ cwd: '/repo', json: true, configPath: 'x.config.ts' });
    expect(mockCore.loadFileLinksConfig).toHaveBeenCalledWith('/repo', {
      configPath: 'x.config.ts',
    });
  });

  it('writes dot to --output relative to cwd', () => {
    const dir = mkdtempSync(join(tmpdir(), 'filelinks-graph-'));
    tempDirs.push(dir);
    expect(
      runGraph({ cwd: dir, json: false, format: 'dot', output: 'g.dot' }),
    ).toBe(0);
    const written = readFileSync(join(dir, 'g.dot'), 'utf8');
    expect(written).toContain('digraph filelinks {');
    expect(written).toContain('n0 -> n1 [label="sync"];');
    expect(stdout).toEqual([]);
    expect(stderr).toEqual([`Wrote ${join(dir, 'g.dot')}`]);
  });

  it('html without --output goes to stdout', () => {
    expect(runGraph({ cwd: '/repo', json: false, format: 'html' })).toBe(0);
    expect(stdout.join('')).toMatch(/^<!doctype html>/);
  });

  it('invalid format returns 1 with message', () => {
    expect(runGraph({ cwd: '/repo', json: false, format: 'svg' })).toBe(1);
    expect(stderr[0]).toContain('Invalid graph format "svg"');
    expect(mockCore.loadFileLinksConfig).not.toHaveBeenCalled();
  });

  it('config load failure returns 1 via normalizeError', () => {
    mockCore.loadFileLinksConfig.mockImplementation(() => {
      throw new Error('no config');
    });
    expect(runGraph({ cwd: '/repo', json: false })).toBe(1);
    expect(stderr).toEqual(['no config']);
  });
});
