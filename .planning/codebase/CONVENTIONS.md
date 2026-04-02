# Conventions and code style

**Snapshot:** No application source code or formatter/linter configuration is checked in. Conventions below cover **what exists** and **reasonable defaults** when code is added.

## Version control

- **Git** is used; default branch tracks `origin/main` (per workspace).
- `.gitignore` is comprehensive for **Node/JavaScript** ecosystems: `node_modules/`, build outputs (`dist`, `.next`), caches (`.eslintcache`, `.parcel-cache`), env files (`.env`), Yarn PnP, etc.

## Language and formatting

- **Not defined** — no Prettier, ESLint, Rustfmt, or Black config in the repo.
- When adding JS/TS, prefer **one** formatter and **one** linter committed at repo root to match the breadth of `.gitignore`.

## Naming

- **Project name:** `filelinks` (see `README.md`).
- **File naming:** TBD with chosen language (e.g. `kebab-case` for CLI tools vs idiomatic module names).

## Error handling and logging

- No patterns to cite; no `try`/`catch` or logging utilities in-tree.

## Documentation

- **README** is the public face; keep it updated when install/run instructions exist.
- **Internal planning:** `.planning/codebase/*.md` for GSD; refresh after major structural changes.

## Environment variables

- `.gitignore` blocks `.env` and `.env.*` except `!.env.example`. If secrets are needed later, document names in `.env.example` **without** values, and never commit real secrets.

## Dependencies

- **None declared.** When a manifest appears, prefer **pinned** versions (lockfile) and document minimum runtime (Node version, etc.) in `README.md` or `STACK.md`.

## Summary

| Area | Status |
|------|--------|
| Linter / formatter | Not configured |
| Test layout | Not established |
| Module boundaries | N/A |

Establish team conventions in config files as soon as the first code lands.
