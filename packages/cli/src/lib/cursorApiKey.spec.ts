import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveCursorApiKey } from './cursorApiKey.js';

describe('resolveCursorApiKey', () => {
  const originalEnv = process.env['CURSOR_API_KEY'];
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
    if (originalEnv === undefined) {
      delete process.env['CURSOR_API_KEY'];
    } else {
      process.env['CURSOR_API_KEY'] = originalEnv;
    }
  });

  it('reads CURSOR_API_KEY from .env under cwd', () => {
    delete process.env['CURSOR_API_KEY'];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filelinks-cursor-key-'));
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'CURSOR_API_KEY=from-dotenv-file\n',
      'utf8',
    );

    expect(resolveCursorApiKey({ cwd: tempDir })).toBe('from-dotenv-file');
  });

  it('prefers process.env over .env', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filelinks-cursor-key-'));
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'CURSOR_API_KEY=from-dotenv-file\n',
      'utf8',
    );
    process.env['CURSOR_API_KEY'] = 'from-process-env';

    expect(resolveCursorApiKey({ cwd: tempDir })).toBe('from-process-env');
  });
});
