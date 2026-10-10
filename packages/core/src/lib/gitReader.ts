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

export function getStagedDiffForPaths(
  cwd: string,
  repoRelativePaths: string[],
): string {
  if (repoRelativePaths.length === 0) {
    return '';
  }
  return execFileSync('git', ['diff', '--cached', '--', ...repoRelativePaths], {
    cwd,
    encoding: 'utf8',
  });
}

/**
 * Content hash of every path with unstaged or untracked changes (`git status`), keyed by
 * repo-relative path. Take one before and one after an agent run to see what the agent wrote.
 */
export function snapshotDirtyPaths(cwd: string): Map<string, string> {
  const status = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd, encoding: 'utf8' },
  );
  const paths: string[] = [];
  const entries = status.split('\0');
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || entry.length < 4) {
      continue;
    }
    const xy = entry.slice(0, 2);
    // Renames/copies carry the original path in the next NUL-separated field.
    if (xy[0] === 'R' || xy[0] === 'C') {
      i++;
    }
    // Only work-tree changes (Y column) and untracked files; deleted files have no content.
    if (xy === '??' || (xy[1] !== ' ' && xy[1] !== 'D')) {
      paths.push(entry.slice(3));
    }
  }
  const snapshot = new Map<string, string>();
  if (paths.length === 0) {
    return snapshot;
  }
  const root = getGitRepoRoot(cwd);
  const hashes = execFileSync('git', ['hash-object', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split('\n');
  paths.forEach((p, idx) => snapshot.set(p, hashes[idx] ?? ''));
  return snapshot;
}

/** Paths that are new or whose content changed between two `snapshotDirtyPaths` calls. */
export function changedSinceSnapshot(
  before: Map<string, string>,
  after: Map<string, string>,
): string[] {
  return [...after]
    .filter(([p, hash]) => before.get(p) !== hash)
    .map(([p]) => p);
}

/** `git add` repo-relative paths (from the repo root). */
export function stagePaths(cwd: string, repoRelativePaths: string[]): void {
  if (repoRelativePaths.length === 0) {
    return;
  }
  execFileSync('git', ['add', '--', ...repoRelativePaths], {
    cwd: getGitRepoRoot(cwd),
  });
}
