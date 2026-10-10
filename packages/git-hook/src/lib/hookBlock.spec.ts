import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HOOK_COMMAND,
  HOOK_BLOCK_END,
  HOOK_BLOCK_START,
  removeHookBlock,
  renderHookBlock,
  upsertHookBlock,
} from './hookBlock.js';

describe('renderHookBlock', () => {
  it('wraps the default command in markers and a FILELINKS_SKIP guard', () => {
    expect(renderHookBlock()).toBe(
      [
        HOOK_BLOCK_START,
        'if [ "$FILELINKS_SKIP" != "1" ]; then',
        `  ${DEFAULT_HOOK_COMMAND} || exit $?`,
        'fi',
        HOOK_BLOCK_END,
      ].join('\n'),
    );
  });

  it('uses a custom command', () => {
    expect(renderHookBlock('pnpm filelinks check')).toContain(
      '  pnpm filelinks check || exit $?',
    );
  });
});

describe('upsertHookBlock', () => {
  const block = renderHookBlock();

  it('creates a new script with shebang when the file does not exist', () => {
    const r = upsertHookBlock(undefined, block);
    expect(r.action).toBe('created');
    expect(r.content).toBe(`#!/bin/sh\n\n${block}\n`);
  });

  it('uses the given shebang for new files', () => {
    const r = upsertHookBlock('', block, '#!/usr/bin/env sh');
    expect(r.content.startsWith('#!/usr/bin/env sh\n')).toBe(true);
  });

  it('inserts right after the shebang so the existing script keeps its exit status', () => {
    const existing = '#!/bin/sh\nnpm test\n';
    const r = upsertHookBlock(existing, block);
    expect(r.action).toBe('inserted');
    expect(r.content).toBe(`#!/bin/sh\n\n${block}\n\nnpm test\n`);
  });

  it('inserts before an `exit` or `exec` so the check is reachable', () => {
    const existing = '#!/bin/sh\nexec npx lint-staged\n';
    const r = upsertHookBlock(existing, block);
    expect(r.content.indexOf(block)).toBeLessThan(
      r.content.indexOf('exec npx lint-staged'),
    );
  });

  it('inserts at the top of a script without a shebang (husky v9)', () => {
    const r = upsertHookBlock('npx lint-staged\n', block);
    expect(r.content).toBe(`${block}\n\nnpx lint-staged\n`);
  });

  it('round-trips through removeHookBlock to the original script', () => {
    for (const original of [
      '#!/bin/sh\nnpm test\n',
      'npx lint-staged\n',
      '#!/bin/sh\nset -e\nnpm test\nexit 0\n',
    ]) {
      const inserted = upsertHookBlock(original, block).content;
      expect(removeHookBlock(inserted).content).toBe(original);
    }
  });

  it('replaces an existing block in place', () => {
    const old = renderHookBlock('old-command');
    const existing = `#!/bin/sh\necho before\n\n${old}\necho after\n`;
    const r = upsertHookBlock(existing, block);
    expect(r.action).toBe('updated');
    expect(r.content).toBe(`#!/bin/sh\necho before\n\n${block}\necho after\n`);
    expect(r.content).not.toContain('old-command');
  });

  it('is idempotent', () => {
    const first = upsertHookBlock('#!/bin/sh\nnpx lint-staged\n', block);
    const second = upsertHookBlock(first.content, block);
    expect(first.action).toBe('inserted');
    expect(second.action).toBe('unchanged');
    expect(second.content).toBe(first.content);
  });
});

describe('removeHookBlock', () => {
  const block = renderHookBlock();

  it('leaves other content intact', () => {
    const installed = upsertHookBlock('#!/bin/sh\nnpx lint-staged\n', block);
    const r = removeHookBlock(installed.content);
    expect(r.removed).toBe(true);
    expect(r.content).toBe('#!/bin/sh\nnpx lint-staged\n');
  });

  it('signals deletion when only a shebang remains', () => {
    const installed = upsertHookBlock(undefined, block);
    expect(removeHookBlock(installed.content)).toEqual({
      content: undefined,
      removed: true,
    });
  });

  it('reports nothing removed when the block is absent', () => {
    expect(removeHookBlock('#!/bin/sh\nnpx lint-staged\n')).toEqual({
      content: '#!/bin/sh\nnpx lint-staged\n',
      removed: false,
    });
  });
});
