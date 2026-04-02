# Repository structure

**Root:** `/mnt/malek/github/vilancer/filelinks/filelinks` (also referenced as project root in GSD metadata).

## Top-level layout (current)

| Path | Kind | Purpose |
|------|------|---------|
| `README.md` | Doc | Project name, one-line vision |
| `LICENSE` | Legal | License text |
| `.gitignore` | Config | Ignore rules (Node/JS-oriented) |
| `.planning/` | Planning | GSD planning artifacts (this map lives under `.planning/codebase/`) |

## Source and test directories

- **None.** No `src/`, `lib/`, `tests/`, `spec/`, or similar directories are present in the repository.

## Configuration and tooling

- **No** `package.json`, `tsconfig.json`, `eslint.config.*`, `Makefile`, or `Dockerfile` at root.
- **No** `.github/` workflows visible at repository root.

## Naming conventions (code)

- **Not established** — no application filenames to observe. Future code should follow one consistent convention per language (e.g. `snake_case` vs `camelCase` per ecosystem norms).

## Planning artifacts

| Path | Purpose |
|------|---------|
| `.planning/codebase/STACK.md` | Technology stack snapshot |
| `.planning/codebase/INTEGRATIONS.md` | External services |
| `.planning/codebase/ARCHITECTURE.md` | System design |
| `.planning/codebase/STRUCTURE.md` | This file |
| `.planning/codebase/CONVENTIONS.md` | Code style and patterns |
| `.planning/codebase/TESTING.md` | Tests and quality gates |
| `.planning/codebase/CONCERNS.md` | Risks and debt |

## Summary

The repo is **flat and minimal**: documentation, license, ignore file, and planning docs. Expect structure to grow once a language and package layout are chosen (e.g. `packages/` monorepo vs single `src/` tree).
