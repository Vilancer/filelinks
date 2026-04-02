import { resolvePrompt } from './promptResolver';
import type { FileLinkConfig, FileLinkEntry } from './schema';

describe('resolvePrompt', () => {
  it('uses global prompt when link has no prompt', () => {
    const globalConfig: FileLinkConfig = {
      prompt: { systemPrompt: 'global', temperature: 0.2 },
    };
    const link: FileLinkEntry = {
      trigger: 'a',
      affects: [],
    };
    expect(resolvePrompt(globalConfig, link)).toEqual({
      systemPrompt: 'global',
      temperature: 0.2,
    });
  });

  it('lets link override global keys', () => {
    const globalConfig: FileLinkConfig = {
      prompt: { systemPrompt: 'global', temperature: 0.2, maxTokens: 100 },
    };
    const link: FileLinkEntry = {
      trigger: 'a',
      affects: [],
      prompt: { temperature: 0.9 },
    };
    expect(resolvePrompt(globalConfig, link)).toEqual({
      systemPrompt: 'global',
      temperature: 0.9,
      maxTokens: 100,
    });
  });

  it('uses only link prompt when global has no prompt', () => {
    const globalConfig: FileLinkConfig = {};
    const link: FileLinkEntry = {
      trigger: 'a',
      affects: [],
      prompt: { systemPrompt: 'link-only' },
    };
    expect(resolvePrompt(globalConfig, link)).toEqual({
      systemPrompt: 'link-only',
    });
  });
});
