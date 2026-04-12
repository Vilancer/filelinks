import { describe, expect, it } from 'vitest';

import { runAdd, serializeFileLinksConfig } from './runAdd.js';

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
    expect(ts).toContain("import { defineLinks } from '@filelinks/core'");
    expect(ts).toContain('export default defineLinks');
  });
});
