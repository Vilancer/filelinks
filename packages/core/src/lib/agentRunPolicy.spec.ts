import { describe, expect, it } from 'vitest';

import { resolveAgentRunPolicy, shouldRunAgentForLink } from './agentRunPolicy';
import { matchStagedLinks } from './linkMatcher';
import { classifyStagedLinks } from './stagedClassifier';
import type { FileLinkConfig, FileLinkEntry } from './schema';
import type { StagedLinkCoverage } from './stagedClassifier';

describe('resolveAgentRunPolicy', () => {
  const entry: FileLinkEntry = {
    trigger: 'a.ts',
    affects: [{ file: 'b.ts', reason: 'sync' }],
  };

  it('uses per-link override over global', () => {
    const global: FileLinkConfig = {
      agent: { runPolicy: 'trigger-only' },
    };
    const link: FileLinkEntry = {
      ...entry,
      agent: { runPolicy: 'trigger-or-affects' },
    };
    expect(resolveAgentRunPolicy(global, link)).toBe('trigger-or-affects');
  });

  it('uses global when per-link omitted', () => {
    const global: FileLinkConfig = {
      agent: { runPolicy: 'trigger-or-affects' },
    };
    expect(resolveAgentRunPolicy(global, entry)).toBe('trigger-or-affects');
  });

  it('defaults to trigger-only when both omitted', () => {
    expect(resolveAgentRunPolicy({}, entry)).toBe('trigger-only');
    expect(resolveAgentRunPolicy({}, {} as FileLinkEntry)).toBe('trigger-only');
  });
});

function coverageFixture(
  partial: Partial<StagedLinkCoverage> &
    Pick<StagedLinkCoverage, 'triggerMatched' | 'affectMatched'>,
): StagedLinkCoverage {
  return {
    entry: {
      trigger: 'a.ts',
      affects: [{ file: 'b.ts', reason: 'sync' }],
    },
    triggerPaths: partial.triggerMatched ? ['a.ts'] : [],
    affectPaths: partial.affectMatched ? ['b.ts'] : [],
    missingAffected: [],
    ...partial,
  };
}

describe('shouldRunAgentForLink', () => {
  it('trigger-only returns false when neither trigger nor affect matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: false,
          affectMatched: false,
        }),
        'trigger-only',
      ),
    ).toBe(false);
  });

  it('trigger-only returns true when trigger matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: true,
          affectMatched: false,
        }),
        'trigger-only',
      ),
    ).toBe(true);
  });

  it('trigger-only returns false when only affect matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: false,
          affectMatched: true,
        }),
        'trigger-only',
      ),
    ).toBe(false);
  });

  it('returns false when neither trigger nor affect matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: false,
          affectMatched: false,
        }),
        'trigger-or-affects',
      ),
    ).toBe(false);
  });

  it('returns true when trigger only matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: true,
          affectMatched: false,
        }),
        'trigger-or-affects',
      ),
    ).toBe(true);
  });

  it('returns true when affect only matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: false,
          affectMatched: true,
        }),
        'trigger-or-affects',
      ),
    ).toBe(true);
  });

  it('returns true when both matched', () => {
    expect(
      shouldRunAgentForLink(
        coverageFixture({
          triggerMatched: true,
          affectMatched: true,
        }),
        'trigger-or-affects',
      ),
    ).toBe(true);
  });

  it('classify + resolve + gate: affect-only staging does not run by default', () => {
    const entry: FileLinkEntry = {
      trigger: 'greet.ts',
      linkType: 'file-dir',
      affects: [{ file: 'malek', reason: 'test' }],
    };
    const staged = ['malek/nested/foo.ts'];
    const [coverage] = classifyStagedLinks(staged, [entry]);
    expect(coverage).toBeDefined();
    const policy = resolveAgentRunPolicy({}, entry);
    expect(policy).toBe('trigger-only');
    expect(shouldRunAgentForLink(coverage, policy)).toBe(false);
    expect(shouldRunAgentForLink(coverage, 'trigger-or-affects')).toBe(true);
    expect(matchStagedLinks(staged, [entry])).toHaveLength(0);
  });
});
