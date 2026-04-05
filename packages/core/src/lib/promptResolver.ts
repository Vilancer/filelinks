import type { FileLinkConfig, FileLinkEntry, PromptConfig } from './schema';

export function resolvePrompt(
  globalConfig: FileLinkConfig,
  link: FileLinkEntry
): PromptConfig {
  return {
    ...(globalConfig.prompt ?? {}),
    ...(link.prompt ?? {}),
  };
}
