# Phase 01 — Technical research (core library)

**Date:** 2026-04-02

## Summary

Focused notes for implementing `@filelinks/core` Phase 1 (no external agent run — consolidated from CONTEXT + ecosystem norms).

### Runtime loading of `filelinks.config.ts`

- **`jiti`**: Common choice for loading TS configs in Node tools; works with `require`-style resolution from CJS packages. Validate `default` export shape `{ links, config }` after load.
- **Alternative considered:** `tsx`/esbuild-register — heavier; CONTEXT locks **jiti**.

### Glob matching

- **`minimatch`**: Matches product doc sample; use for both trigger and affected file patterns. Normalize paths to forward slashes before matching for cross-platform consistency.

### Git integration

- **`child_process.execFile('git', args, { cwd })`**: Avoid shell injection; cwd = repo root from `git rev-parse --show-toplevel`.
- **Staged files:** Prefer **`git diff -z --name-only --cached`** and split on `\0` so paths with spaces/newlines are safe; aligns with cross-AI review (`01-REVIEWS.md`).

### Testing

- Mock `execFile` via Vitest `vi.mock('node:child_process')` or inject a git adapter if planner prefers thin wrapper for testability.

---

## RESEARCH COMPLETE

Plans may proceed. Nyquist validation is **off** for this project (`workflow.nyquist_validation: false`); no `VALIDATION.md` required.
