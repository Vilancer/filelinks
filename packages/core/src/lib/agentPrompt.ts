import { readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

import type { StagedLinkCoverage } from './stagedClassifier';
import type { AffectedFile, PromptConfig } from './schema';

const MAX_FILE_BYTES = 256 * 1024;

export type AffectedFileContent = {
  path: string;
  reason: string;
  content: string;
};

export function readAffectedContents(
  cwd: string,
  affects: AffectedFile[],
): AffectedFileContent[] {
  return affects.map((aff) => {
    const repoPath = aff.file;
    const absPath = path.join(cwd, repoPath);
    try {
      const st = statSync(absPath);
      if (st.isDirectory()) {
        return {
          path: repoPath,
          reason: aff.reason,
          content: `(directory at ${repoPath} — contents not included in v1.1)`,
        };
      }
      const raw = readFileSync(absPath, 'utf8');
      return {
        path: repoPath,
        reason: aff.reason,
        content: truncateContent(raw),
      };
    } catch {
      return {
        path: repoPath,
        reason: aff.reason,
        content: `(file not found at ${repoPath})`,
      };
    }
  });
}

function truncateContent(text: string): string {
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes <= MAX_FILE_BYTES) {
    return text;
  }
  let end = text.length;
  while (
    end > 0 &&
    Buffer.byteLength(text.slice(0, end), 'utf8') > MAX_FILE_BYTES
  ) {
    end -= 1;
  }
  return `${text.slice(0, end)}…(truncated)`;
}

export function buildAgentPrompt(input: {
  prompt: PromptConfig;
  coverage: StagedLinkCoverage;
  triggerDiff: string;
  affectedFiles: AffectedFileContent[];
}): string {
  const { prompt, coverage, triggerDiff, affectedFiles } = input;
  const { entry, triggerPaths } = coverage;
  const lines: string[] = [];

  if (prompt.systemPrompt) {
    lines.push(prompt.systemPrompt.trim());
    lines.push('');
  }

  // v1.1: temperature/maxTokens are prompt metadata only (not Cursor SDK Agent.create options).
  const meta: string[] = [];
  if (prompt.temperature !== undefined) {
    meta.push(`temperature: ${prompt.temperature}`);
  }
  if (prompt.maxTokens !== undefined) {
    meta.push(`maxTokens: ${prompt.maxTokens}`);
  }
  if (meta.length > 0) {
    lines.push(meta.join(', '));
    lines.push('');
  }

  lines.push(`Trigger pattern: \`${entry.trigger}\``);
  for (const aff of entry.affects) {
    lines.push(`- Affect \`${aff.file}\`: ${aff.reason}`);
  }
  lines.push('');

  lines.push('## Staged changes (trigger)');
  if (triggerPaths.length === 0 && !triggerDiff.trim()) {
    lines.push('No trigger files staged');
  } else if (triggerDiff.trim()) {
    lines.push('```diff');
    lines.push(triggerDiff.trimEnd());
    lines.push('```');
  } else {
    lines.push('(no staged diff for trigger paths)');
  }
  lines.push('');

  lines.push('## Affected files');
  if (affectedFiles.length === 0) {
    lines.push('(none declared)');
  } else {
    for (const file of affectedFiles) {
      lines.push(`### ${file.path}`);
      lines.push(`Reason: ${file.reason}`);
      lines.push('```');
      lines.push(file.content);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}
