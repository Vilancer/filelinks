import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

import * as fg from 'fast-glob';
import { getGitRepoRoot } from '@filelinks/core';

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

export function listPathCandidatesWithMeta(cwd: string): PathCandidateMeta {
  const resolved = path.resolve(cwd);

  const addFallbackDirs = (
    rootDir: string,
    set: Set<string>,
    directories: Set<string>,
  ): void => {
    // Non-git fallback only: keep traversal bounded for responsiveness.
    const dirs = fg.sync('**/*', {
      cwd: rootDir,
      dot: false,
      onlyDirectories: true,
      deep: 8,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });
    for (const d of dirs) {
      const norm = toPosix(d).replace(/\/+$/, '');
      if (isSearchableCandidate(norm)) {
        set.add(norm);
        directories.add(norm);
      }
    }
  };

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
    const files = s ? s.split('\0').filter(Boolean) : [];
    const set = new Set<string>();
    const directories = new Set<string>();
    for (const f of files) {
      const norm = toPosix(f);
      if (isSearchableCandidate(norm)) {
        set.add(norm);
      }
      let dir = path.posix.dirname(norm);
      while (dir && dir !== '.' && dir !== '/') {
        if (isSearchableCandidate(dir)) {
          set.add(dir);
          directories.add(dir);
        }
        const next = path.posix.dirname(dir);
        if (next === dir) {
          break;
        }
        dir = next;
      }
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
    const otherDirs = otherRaw ? otherRaw.split('\0').filter(Boolean) : [];
    for (const d of otherDirs) {
      const isDirEntry = d.endsWith('/');
      const norm = toPosix(d).replace(/\/+$/, '');
      if (!isSearchableCandidate(norm)) {
        continue;
      }
      set.add(norm);
      if (isDirEntry) {
        directories.add(norm);
      }
      let parent = path.posix.dirname(norm);
      while (parent && parent !== '.' && parent !== '/') {
        if (isSearchableCandidate(parent)) {
          set.add(parent);
          directories.add(parent);
        }
        const next = path.posix.dirname(parent);
        if (next === parent) {
          break;
        }
        parent = next;
      }
    }
    return {
      candidates: [...set]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_LIST),
      directories,
    };
  } catch {
    const entries = fg.sync('**/*', {
      cwd: resolved,
      dot: false,
      onlyFiles: false,
      markDirectories: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });
    const out = new Set<string>();
    const directories = new Set<string>();
    for (const e of entries) {
      const rel = toPosix(path.relative(resolved, path.join(resolved, e)));
      if (!isSearchableCandidate(rel)) {
        continue;
      }
      const isDir = rel.endsWith('/');
      const trimmed = isDir ? rel.slice(0, -1) : rel;
      out.add(trimmed);
      if (isDir) {
        directories.add(trimmed);
      }
    }
    addFallbackDirs(resolved, out, directories);
    return {
      candidates: [...out]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_LIST),
      directories,
    };
  }
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
