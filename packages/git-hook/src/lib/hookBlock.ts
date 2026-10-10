/** Start marker of the filelinks-managed block inside a hook script. */
export const HOOK_BLOCK_START = '# >>> filelinks >>>';
/** End marker of the filelinks-managed block inside a hook script. */
export const HOOK_BLOCK_END = '# <<< filelinks <<<';
/** Command the installed hook runs by default. */
export const DEFAULT_HOOK_COMMAND = 'npx --no-install filelinks-git-hook run';
/** Hook installed when `--hook` is omitted. */
export const DEFAULT_HOOK_NAME = 'pre-commit';
/** Shebang for new plain `.git/hooks/*` scripts. */
export const GIT_HOOK_SHEBANG = '#!/bin/sh';
/** Shebang for new husky scripts (optional for husky v9, harmless). */
export const HUSKY_HOOK_SHEBANG = '#!/usr/bin/env sh';

/** Render the managed block (no trailing newline). */
export function renderHookBlock(
  command: string = DEFAULT_HOOK_COMMAND,
): string {
  return [
    HOOK_BLOCK_START,
    'if [ "$FILELINKS_SKIP" != "1" ]; then',
    `  ${command} || exit $?`,
    'fi',
    HOOK_BLOCK_END,
  ].join('\n');
}

export type UpsertAction = 'created' | 'inserted' | 'updated' | 'unchanged';

export interface UpsertResult {
  content: string;
  action: UpsertAction;
}

function findBlock(
  content: string,
): { start: number; end: number } | undefined {
  const start = content.indexOf(HOOK_BLOCK_START);
  if (start === -1) {
    return undefined;
  }
  const endMarker = content.indexOf(HOOK_BLOCK_END, start);
  if (endMarker === -1) {
    return undefined;
  }
  return { start, end: endMarker + HOOK_BLOCK_END.length };
}

/**
 * Insert or replace the managed block in a hook script.
 * - `existing` undefined/blank → new script with `shebang` + block
 * - block present → replaced in place
 * - otherwise → block inserted right after the shebang (or at the top), so it always runs and
 *   the existing script keeps its own control flow and final exit status (appending would be
 *   skipped by an `exit`/`exec`, and would mask a failing last command without `set -e`)
 */
export function upsertHookBlock(
  existing: string | undefined,
  block: string,
  shebang: string = GIT_HOOK_SHEBANG,
): UpsertResult {
  if (existing === undefined || existing.trim() === '') {
    return { content: `${shebang}\n\n${block}\n`, action: 'created' };
  }
  const found = findBlock(existing);
  if (found) {
    const content =
      existing.slice(0, found.start) + block + existing.slice(found.end);
    return {
      content,
      action: content === existing ? 'unchanged' : 'updated',
    };
  }
  const firstLineEnd = existing.indexOf('\n');
  if (existing.startsWith('#!')) {
    const shebangLine =
      firstLineEnd === -1 ? existing : existing.slice(0, firstLineEnd);
    const rest = firstLineEnd === -1 ? '' : existing.slice(firstLineEnd + 1);
    const tail = rest.trim() === '' ? '' : `\n${rest}`;
    return {
      content: `${shebangLine}\n\n${block}\n${tail}`,
      action: 'inserted',
    };
  }
  return { content: `${block}\n\n${existing}`, action: 'inserted' };
}

export interface RemoveResult {
  /** Remaining content, or `undefined` when the file should be deleted. */
  content: string | undefined;
  removed: boolean;
}

/** True when `content` has nothing but an optional shebang and whitespace. */
function isEmptyHookScript(content: string): boolean {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  return (
    lines.length === 0 || (lines.length === 1 && lines[0].startsWith('#!'))
  );
}

/** Remove the managed block and the blank lines `upsertHookBlock` put around it. */
export function removeHookBlock(existing: string): RemoveResult {
  const found = findBlock(existing);
  if (!found) {
    return { content: existing, removed: false };
  }
  let before = existing.slice(0, found.start);
  let after = existing.slice(found.end);
  for (let i = 0; i < 2 && after.startsWith('\n'); i++) {
    after = after.slice(1);
  }
  if (before.endsWith('\n\n')) {
    before = before.slice(0, -1);
  }
  const content = before + after;
  if (isEmptyHookScript(content)) {
    return { content: undefined, removed: true };
  }
  return { content, removed: true };
}
