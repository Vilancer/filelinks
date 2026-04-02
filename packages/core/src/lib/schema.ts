export interface PromptConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FileLinkConfig {
  prompt?: PromptConfig;
}

export interface FileLinkEntry {
  trigger: string;
  affects: AffectedFile[];
  severity?: 'warn' | 'error';
  prompt?: PromptConfig;
}

export interface AffectedFile {
  file: string;
  reason: string;
}

export function defineLinks(
  links: FileLinkEntry[],
  config?: FileLinkConfig
): { links: FileLinkEntry[]; config: FileLinkConfig } {
  return { links, config: config ?? {} };
}
