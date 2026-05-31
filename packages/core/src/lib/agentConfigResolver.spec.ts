import { describe, expect, it } from 'vitest';

import {
  resolveAgentConfig,
  validateResolvedAgentConfig,
} from './agentConfigResolver';
import { AgentConfigError } from './errors';
import type { AgentSettings, FileLinkConfig, FileLinkEntry } from './schema';

const baseEntry: FileLinkEntry = {
  trigger: 'a.ts',
  affects: [{ file: 'b.ts', reason: 'sync' }],
};

describe('resolveAgentConfig', () => {
  it('uses per-link override for runtime and local.cwd', () => {
    const global: FileLinkConfig = {
      agent: {
        provider: 'cursor',
        runtime: 'cloud',
        cloud: { repos: ['org/repo'] },
      },
    };
    const link: FileLinkEntry = {
      ...baseEntry,
      agent: {
        provider: 'cursor',
        runtime: 'local',
        local: { cwd: '/tmp/project' },
      },
    };
    expect(resolveAgentConfig(global, link)).toEqual({
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
      local: { cwd: '/tmp/project' },
    });
  });

  it('defaults model to composer-2.5 when omitted for cursor', () => {
    const config: FileLinkConfig = {
      agent: {
        provider: 'cursor',
        runtime: 'local',
        local: { cwd: '.' },
      },
    };
    expect(resolveAgentConfig(config, baseEntry).model).toBe('composer-2.5');
  });

  it('preserves explicit model for cursor', () => {
    const config: FileLinkConfig = {
      agent: {
        provider: 'cursor',
        runtime: 'local',
        model: 'gpt-4',
        local: { cwd: '.' },
      },
    };
    expect(resolveAgentConfig(config, baseEntry).model).toBe('gpt-4');
  });
});

describe('validateResolvedAgentConfig', () => {
  const validLocal: AgentSettings = {
    provider: 'cursor',
    runtime: 'local',
    local: { cwd: '.' },
  };

  it('throws when provider is missing', () => {
    expect(() =>
      validateResolvedAgentConfig({ runtime: 'local', local: { cwd: '.' } }),
    ).toThrow(AgentConfigError);
  });

  it('throws when runtime is missing', () => {
    expect(() =>
      validateResolvedAgentConfig({ provider: 'cursor', local: { cwd: '.' } }),
    ).toThrow(AgentConfigError);
  });

  it('throws when local runtime has no cwd', () => {
    expect(() =>
      validateResolvedAgentConfig({
        provider: 'cursor',
        runtime: 'local',
      }),
    ).toThrow(/agent\.local\.cwd/);
  });

  it('throws when local cwd is whitespace only', () => {
    expect(() =>
      validateResolvedAgentConfig({
        provider: 'cursor',
        runtime: 'local',
        local: { cwd: '   ' },
      }),
    ).toThrow(/agent\.local\.cwd/);
  });

  it('throws when cloud runtime has no repos', () => {
    expect(() =>
      validateResolvedAgentConfig({
        provider: 'cursor',
        runtime: 'cloud',
      }),
    ).toThrow(/agent\.cloud\.repos/);
  });

  it('throws when cloud repos array is empty', () => {
    expect(() =>
      validateResolvedAgentConfig({
        provider: 'cursor',
        runtime: 'cloud',
        cloud: { repos: [] },
      }),
    ).toThrow(/agent\.cloud\.repos/);
  });
});
