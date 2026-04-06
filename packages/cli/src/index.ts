import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export { runCli } from './lib/cli.js';

import { runCli } from './lib/cli.js';

/** True when this file is the process entry (not when imported). Uses realpath so pnpm/npm bin symlinks match. */
function isMainModule(): boolean {
  const invoked = process.argv[1];
  if (!invoked) {
    return false;
  }
  const entryPath = fileURLToPath(import.meta.url);
  try {
    return realpathSync(resolve(invoked)) === realpathSync(resolve(entryPath));
  } catch {
    return resolve(invoked) === resolve(entryPath);
  }
}

if (isMainModule()) {
  runCli(process.argv);
}
