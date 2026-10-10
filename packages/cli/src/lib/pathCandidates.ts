import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

import { globSync } from 'tinyglobby';
import { getGitRepoRoot } from '@vilancer/filelinks-core';

const MAX_LIST = 50_000;
const MAX_FILTER_RESULTS = 200;
const EXCLUDED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.pnpm',
  '.yarn',
  '.next',
  '.turbo',
  'dist',
]);

/** Normalize to forward slashes for repo-relative paths. */
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

export function isSearchableCandidate(p: string): boolean {
  const trimmed = p.trim();
  if (!trimmed || trimmed.startsWith('..')) {
    return false;
  }
  const norm = toPosix(trimmed).replace(/\/+$/, '');
  if (!norm || norm === '.') {
    return false;
  }
  const parts = norm.split('/');
  for (const part of parts) {
    if (EXCLUDED_SEGMENTS.has(part)) {
      return false;
    }
  }
  return true;
}

/**
 * Lists repo-relative file and directory paths for search UI.
 * Prefers `git ls-files` inside a git work tree; otherwise glob from `cwd`.
 */
export function listPathCandidates(cwd: string): string[] {
  return listPathCandidatesWithMeta(cwd).candidates;
}

export type PathCandidateMeta = {
  readonly candidates: string[];
  readonly directories: Set<string>;
};

/**
 * Add `p` (a directory when `isDir`) and every ancestor directory of it. Deriving directories
 * from ancestors also covers entries a walker reports only through their children, such as a
 * symlinked directory (`docs -> shared/docs` shows up as `docs/a.md`, never as `docs/`).
 */
function addWithAncestors(
  p: string,
  isDir: boolean,
  set: Set<string>,
  directories: Set<string>,
): void {
  if (isSearchableCandidate(p)) {
    set.add(p);
    if (isDir) {
      directories.add(p);
    }
  }
  for (
    let dir = path.posix.dirname(p);
    dir !== '.' && dir !== '/';
    dir = path.posix.dirname(dir)
  ) {
    if (isSearchableCandidate(dir)) {
      set.add(dir);
      directories.add(dir);
    }
  }
}

function toMeta(set: Set<string>, directories: Set<string>): PathCandidateMeta {
  return {
    candidates: [...set].sort((a, b) => a.localeCompare(b)).slice(0, MAX_LIST),
    directories,
  };
}

export function listPathCandidatesWithMeta(cwd: string): PathCandidateMeta {
  const resolved = path.resolve(cwd);
  const set = new Set<string>();
  const directories = new Set<string>();

  try {
    const root = getGitRepoRoot(resolved);
    const buf = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      {
        cwd: root,
        maxBuffer: 1024 * 1024 * 80,
      },
    );
    const s = buf.toString('utf8');
    for (const f of s ? s.split('\0').filter(Boolean) : []) {
      addWithAncestors(toPosix(f), false, set, directories);
    }

    // Fast git-native untracked directory listing (avoids expensive full FS walk).
    const otherBuf = execFileSync(
      'git',
      ['ls-files', '--others', '--exclude-standard', '--directory', '-z'],
      {
        cwd: root,
        maxBuffer: 1024 * 1024 * 20,
      },
    );
    const otherRaw = otherBuf.toString('utf8');
    for (const d of otherRaw ? otherRaw.split('\0').filter(Boolean) : []) {
      const norm = toPosix(d).replace(/\/+$/, '');
      addWithAncestors(norm, d.endsWith('/'), set, directories);
    }
    return toMeta(set, directories);
  } catch {
    return listFromFilesystem(resolved);
  }
}

/** Not a git work tree: one filesystem walk. Directories come back with a trailing `/`. */
function listFromFilesystem(root: string): PathCandidateMeta {
  const set = new Set<string>();
  const directories = new Set<string>();
  const entries = globSync('**/*', {
    cwd: root,
    dot: false,
    onlyFiles: false,
    expandDirectories: false,
    ignore: ['**/node_modules/**', '**/.git/**'],
  });
  for (const e of entries) {
    const norm = toPosix(e).replace(/\/+$/, '');
    addWithAncestors(norm, e.endsWith('/'), set, directories);
  }
  return toMeta(set, directories);
}

/** Substring filter (case-insensitive); caps result count. */
export function filterPaths(candidates: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return candidates.slice(0, MAX_FILTER_RESULTS);
  }
  const out: string[] = [];
  for (const c of candidates) {
    if (c.toLowerCase().includes(q)) {
      out.push(c);
      if (out.length >= MAX_FILTER_RESULTS) {
        break;
      }
    }
  }
  return out;
}
