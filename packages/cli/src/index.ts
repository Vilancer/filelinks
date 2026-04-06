export { runCli } from './lib/cli';

import { runCli } from './lib/cli';

if (require.main === module) {
  runCli(process.argv);
}
