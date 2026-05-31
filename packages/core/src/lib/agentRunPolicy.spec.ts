import { describe, expect, it } from 'vitest';

import { resolveAgentRunPolicy } from './agentRunPolicy';
import type { FileLinkConfig, FileLinkEntry } from './schema';

describe('resolveAgentRunPolicy', () => {
  const entry: FileLinkEntry = {
    trigger: 'a.ts',
    affects: [{ file: 'b.ts', reason: 'sync' }],
  };

  it('uses per-link override over global', () => {
    const global: FileLinkConfig = {
      agent: { runPolicy: 'trigger-or-affects' },
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

  it('defaults to trigger-or-affects when both omitted', () => {
    expect(resolveAgentRunPolicy({}, entry)).toBe('trigger-or-affects');
    expect(resolveAgentRunPolicy({}, {} as FileLinkEntry)).toBe(
      'trigger-or-affects',
    );
  });
});
