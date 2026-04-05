import { execFileSync } from 'node:child_process';

export function getGitRepoRoot(cwd: string): string {
  const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  });
  return out.trim();
}

export function getStagedFilePaths(cwd: string): string[] {
  const buf = execFileSync('git', ['diff', '-z', '--name-only', '--cached'], {
    cwd,
  });
  const s = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
  if (!s) {
    return [];
  }
  return s.split('\0').filter(Boolean);
}
