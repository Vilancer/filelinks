import type {
  AgentSettings,
  FileLinkEntry,
  PromptConfig,
} from '@vilancer/filelinks-core';

export type AddCommitPayload = {
  entry: FileLinkEntry;
  configAgent?: AgentSettings;
  configPrompt?: PromptConfig;
};
