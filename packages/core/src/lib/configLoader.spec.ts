import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { findConfigFile, loadFileLinksConfig } from './configLoader';

const fixtureDir = path.join(__dirname, '__fixtures__', 'sample-filelinks-config');

describe('configLoader', () => {
  it('findConfigFile returns path when file exists in directory', () => {
    const p = findConfigFile(fixtureDir);
    expect(p).toBe(path.join(fixtureDir, 'filelinks.config.ts'));
  });

  it('findConfigFile walks upward to find config', () => {
    const nested = path.join(fixtureDir, 'nested', 'deep');
    fs.mkdirSync(nested, { recursive: true });
    const p = findConfigFile(nested);
    expect(p).toBe(path.join(fixtureDir, 'filelinks.config.ts'));
  });

  it('loadFileLinksConfig loads default export from filelinks.config.ts', () => {
    const { links, config } = loadFileLinksConfig(fixtureDir);
    expect(links.length).toBe(1);
    expect(links[0]?.trigger).toBe('apps/**/*.ts');
    expect(config.prompt?.temperature).toBe(0.2);
  });
});
