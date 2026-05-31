import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildAgentPrompt, readAffectedContents } from './agentPrompt';
import type { StagedLinkCoverage } from './stagedClassifier';
import type { FileLinkEntry } from './schema';

describe('readAffectedContents', () => {
  let cwd: string;

  afterEach(() => {
    cwd = '';
  });

  it('uses placeholder when file is missing on disk', () => {
    cwd = mkdtempSync(path.join(tmpdir(), 'filelinks-agent-'));
    const result = readAffectedContents(cwd, [
      { file: 'missing.ts', reason: 'keep in sync' },
    ]);
    expect(result[0]?.content).toContain('file not found at missing.ts');
  });

  it('reads file contents when present', () => {
    cwd = mkdtempSync(path.join(tmpdir(), 'filelinks-agent-'));
    writeFileSync(path.join(cwd, 'b.ts'), 'export const x = 1;\n', 'utf8');
    const result = readAffectedContents(cwd, [
      { file: 'b.ts', reason: 'mirror' },
    ]);
    expect(result[0]?.content).toBe('export const x = 1;\n');
  });

  it('notes directories without walking the tree', () => {
    cwd = mkdtempSync(path.join(tmpdir(), 'filelinks-agent-'));
    mkdirSync(path.join(cwd, 'pkg'), { recursive: true });
    const result = readAffectedContents(cwd, [
      { file: 'pkg', reason: 'package root' },
    ]);
    expect(result[0]?.content).toContain('directory at pkg');
  });
});

function coverageFixture(
  partial: Partial<StagedLinkCoverage> & {
    entry?: FileLinkEntry;
    triggerPaths?: string[];
  },
): StagedLinkCoverage {
  const entry: FileLinkEntry = partial.entry ?? {
    trigger: 'src/a.ts',
    affects: [{ file: 'src/b.ts', reason: 'sync types' }],
  };
  return {
    entry,
    triggerMatched: (partial.triggerPaths?.length ?? 0) > 0,
    affectMatched: false,
    triggerPaths: partial.triggerPaths ?? [],
    affectPaths: [],
    missingAffected: [],
    ...partial,
  };
}

describe('buildAgentPrompt', () => {
  it('includes system prompt and affect path', () => {
    const prompt = buildAgentPrompt({
      prompt: { systemPrompt: 'You are a filelinks reviewer.' },
      coverage: coverageFixture({ triggerPaths: ['src/a.ts'] }),
      triggerDiff: 'diff --git a/src/a.ts\n',
      affectedFiles: [
        { path: 'src/b.ts', reason: 'sync types', content: 'const b = 1;' },
      ],
    });
    expect(prompt).toContain('You are a filelinks reviewer.');
    expect(prompt).toContain('src/b.ts');
    expect(prompt).toContain('## Staged changes (trigger)');
    expect(prompt).toContain('diff --git a/src/a.ts');
    expect(prompt).toContain('## Affected files');
  });

  it('shows No trigger files staged for affect-only coverage', () => {
    const prompt = buildAgentPrompt({
      prompt: {},
      coverage: coverageFixture({
        triggerPaths: [],
        entry: {
          trigger: 'src/a.ts',
          affects: [{ file: 'src/b.ts', reason: 'sync' }],
        },
      }),
      triggerDiff: '',
      affectedFiles: [
        { path: 'src/b.ts', reason: 'sync', content: 'updated' },
      ],
    });
    expect(prompt).toContain('No trigger files staged');
    expect(prompt).toContain('updated');
  });
});
