import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';
import {
  AgentMissingApiKeyError,
  validateResolvedAgentConfig,
} from '@vilancer/filelinks-core';

import {
  listWizardModels,
  mergeConfigUpdates,
  normalizeAddCommitPayload,
  runAdd,
  serializeFileLinksConfig,
  summarizeExistingGlobalAgent,
} from './runAdd.js';

describe('runAdd', () => {
  it('refuses --json (D-24)', async () => {
    const code = await runAdd({
      cwd: process.cwd(),
      verbose: false,
      json: true,
    });
    expect(code).toBe(1);
  });
});

describe('serializeFileLinksConfig', () => {
  it('produces a loadable config file (integration)', () => {
    const ts = serializeFileLinksConfig(
      [
        {
          trigger: 'x',
          affects: [{ file: 'y', reason: 'z' }],
          severity: 'warn',
        },
      ],
      {},
    );
    expect(ts).toContain(
      "import { defineLinks } from '@vilancer/filelinks-core'",
    );
    expect(ts).toContain('export default defineLinks');
  });

  it('serializes global and per-link agent config when provided', () => {
    const ts = serializeFileLinksConfig(
      [
        {
          trigger: 'x',
          affects: [{ file: 'y', reason: 'z' }],
          severity: 'warn',
          agent: {
            provider: 'cursor',
            runtime: 'cloud',
            runPolicy: 'trigger-only',
            cloud: { repos: ['acme/repo'] },
          },
        },
      ],
      {
        agent: {
          provider: 'cursor',
          runtime: 'local',
          runPolicy: 'trigger-only',
          local: { cwd: '.' },
        },
      },
    );

    expect(ts).toContain('"agent"');
    expect(ts).toContain('"runtime": "local"');
    expect(ts).toContain('"runtime": "cloud"');
    expect(ts).toContain('"repos"');
    expect(ts).toContain('"cwd": "."');
  });
});

describe('normalizeAddCommitPayload', () => {
  it('supports skip of global and per-link agent config', () => {
    const normalized = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
      },
    });

    expect(normalized.config).toEqual({});
    expect(normalized.links[0]?.agent).toBeUndefined();
  });

  it('supports global-only agent config', () => {
    const normalized = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
      },
      configAgent: {
        provider: 'cursor',
        runtime: 'local',
        runPolicy: 'trigger-only',
        local: { cwd: '.' },
      },
    });

    expect(normalized.config.agent?.runtime).toBe('local');
    expect(normalized.config.agent?.model).toBeUndefined();
    expect(normalized.links[0]?.agent).toBeUndefined();
  });

  it('supports global plus per-link override with explicit models', () => {
    const normalized = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
        agent: {
          provider: 'cursor',
          runtime: 'cloud',
          model: 'composer-2',
          runPolicy: 'trigger-only',
          cloud: { repos: ['acme/repo'] },
        },
      },
      configAgent: {
        provider: 'cursor',
        runtime: 'local',
        model: 'composer-2.5',
        runPolicy: 'trigger-only',
        local: { cwd: '.' },
      },
    });

    expect(normalized.config.agent?.runtime).toBe('local');
    expect(normalized.config.agent?.model).toBe('composer-2.5');
    expect(normalized.links[0]?.agent?.runtime).toBe('cloud');
    expect(normalized.links[0]?.agent?.model).toBe('composer-2');
  });

  it('supports global prompt and per-link prompt override', () => {
    const normalized = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
        prompt: {
          systemPrompt: 'link override',
          temperature: 0.8,
        },
      },
      configPrompt: {
        systemPrompt: 'global prompt',
        maxTokens: 900,
      },
    });

    expect(normalized.config.prompt?.systemPrompt).toBe('global prompt');
    expect(normalized.config.prompt?.maxTokens).toBe(900);
    expect(normalized.links[0]?.prompt?.systemPrompt).toBe('link override');
    expect(normalized.links[0]?.prompt?.temperature).toBe(0.8);
  });

  it('requires local.cwd and cloud.repos at runtime validation', () => {
    const localMissing = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
      },
      configAgent: {
        provider: 'cursor',
        runtime: 'local',
        runPolicy: 'trigger-only',
      },
    });

    const cloudMissing = normalizeAddCommitPayload({
      entry: {
        trigger: 'src/a.ts',
        affects: [{ file: 'src/b.ts', reason: 'sync' }],
        severity: 'warn',
      },
      configAgent: {
        provider: 'cursor',
        runtime: 'cloud',
        runPolicy: 'trigger-only',
      },
    });

    expect(() =>
      validateResolvedAgentConfig(localMissing.config.agent ?? {}),
    ).toThrow('agent.local.cwd is required when runtime is local');
    expect(() =>
      validateResolvedAgentConfig(cloudMissing.config.agent ?? {}),
    ).toThrow('agent.cloud.repos is required when runtime is cloud');
  });
});

describe('mergeConfigUpdates', () => {
  it('preserves unrelated config keys while adding config.agent and config.prompt', () => {
    const merged = mergeConfigUpdates(
      {
        prompt: {
          systemPrompt: 'keep this',
          temperature: 0.1,
          maxTokens: 1200,
        },
      },
      {
        provider: 'cursor',
        runtime: 'local',
        runPolicy: 'trigger-only',
        local: { cwd: '/tmp/repo' },
      },
      {
        systemPrompt: 'replace prompt',
        temperature: 0.3,
      },
    );

    expect(merged.prompt?.systemPrompt).toBe('replace prompt');
    expect(merged.prompt?.temperature).toBe(0.3);
    expect(merged.agent?.runtime).toBe('local');
    expect(merged.agent?.local?.cwd).toBe('/tmp/repo');
  });
});

describe('listWizardModels', () => {
  it('throws AgentMissingApiKeyError when credentials are missing', async () => {
    const prev = process.env['CURSOR_API_KEY'];
    delete process.env['CURSOR_API_KEY'];

    await expect(
      listWizardModels(
        {
          provider: 'cursor',
          runtime: 'local',
          runPolicy: 'trigger-only',
          local: { cwd: '.' },
        },
        process.cwd(),
      ),
    ).rejects.toBeInstanceOf(AgentMissingApiKeyError);

    if (prev !== undefined) {
      process.env['CURSOR_API_KEY'] = prev;
    }
  });
});

describe('summarizeExistingGlobalAgent', () => {
  it('returns undefined when no global agent exists', () => {
    const summary = summarizeExistingGlobalAgent(process.cwd());
    expect(summary).toBeUndefined();
  });

  it('returns compact summary for existing global agent', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'filelinks-add-'));
    const cfgPath = path.join(tmp, 'filelinks.config.ts');
    const scopeDir = path.join(tmp, 'node_modules', '@vilancer');
    fs.mkdirSync(scopeDir, { recursive: true });
    fs.symlinkSync(
      path.resolve(__dirname, '../../../core'),
      path.join(scopeDir, 'filelinks-core'),
    );
    fs.writeFileSync(
      cfgPath,
      `import { defineLinks } from '@vilancer/filelinks-core';

export default defineLinks(
  [{ trigger: 'a.ts', affects: [{ file: 'b.ts', reason: 'sync' }] }],
  {
    agent: {
      provider: 'cursor',
      runtime: 'local',
      model: 'composer-2.5',
      local: { cwd: '.' },
    },
  },
);
`,
      'utf8',
    );

    const summary = summarizeExistingGlobalAgent(tmp);
    expect(summary).toContain('provider=cursor');
    expect(summary).toContain('runtime=local');
    expect(summary).toContain('model=composer-2.5');
    expect(summary).toContain('cwd=.');
  });
});
