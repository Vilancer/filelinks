import type {
  AgentSettings,
  FileLinkEntry,
  PromptConfig,
} from '@filelinks/core';

export type AddCommitPayload = {
  entry: FileLinkEntry;
  configAgent?: AgentSettings;
  configPrompt?: PromptConfig;
};
