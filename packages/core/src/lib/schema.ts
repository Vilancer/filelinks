export interface PromptConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FileLinkConfig {
  prompt?: PromptConfig;
}

/** Declares how trigger paths relate to affected paths (file vs directory semantics). */
export type LinkType = 'file-file' | 'dir-dir' | 'file-dir' | 'dir-file';

export interface FileLinkEntry {
  trigger: string;
  affects: AffectedFile[];
  /** Optional; when set, documents intent for CLI/list and future validation. Matching still uses minimatch on repo-relative paths. */
  linkType?: LinkType;
  severity?: 'warn' | 'error';
  prompt?: PromptConfig;
}

export interface AffectedFile {
  file: string;
  reason: string;
}

export function defineLinks(
  links: FileLinkEntry[],
  config?: FileLinkConfig,
): { links: FileLinkEntry[]; config: FileLinkConfig } {
  return { links, config: config ?? {} };
}
