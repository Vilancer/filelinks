# Technology stack

**Snapshot:** The repository is a **greenfield** project: there is no `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, or other manifest at the repository root. Only documentation and ignore rules are present.

## Intended product (from README)

- **Name:** `filelinks` (see `README.md`)
- **Purpose:** A language-agnostic tool for declaring semantic relationships between files so agents, git hooks, or editors know what to validate when files change.

## Languages and runtime

- **Not yet chosen** in code. No source files under version control.
- The **product vision** is tool-agnostic; implementation language (e.g. Node, Rust, Go) is TBD.

## Frameworks and dependencies

- **None declared.** No lockfiles or dependency trees.

## Configuration files present

| Path | Role |
|------|------|
| `README.md` | Project description and goals |
| `LICENSE` | License terms |
| `.gitignore` | Broad Node/JavaScript ecosystem ignores (see `STACK.md` / `CONVENTIONS.md` cross-reference) |

## Inferred direction from `.gitignore`

The ignore file (`/.gitignore`) suggests a likely **Node/npm/yarn**-adjacent toolchain when code lands: entries for `node_modules/`, Vite, Next.js, ESLint cache, TypeScript `*.tsbuildinfo`, etc. This is **not** confirmation of a chosen stack—only preparation for common JS tooling.

## Build, CI, and deployment

- No CI configuration observed in-repo (e.g. no `.github/workflows/`, no `Makefile`).
- No container or deployment manifests.

## Version control

- Git repository with default branch tracking `origin/main` (per workspace metadata).

## Summary

| Layer | Status |
|--------|--------|
| Application code | Absent |
| Package / module system | Not defined |
| Runtime | Not defined |
| Config for tooling | `.gitignore` only |

When implementation begins, update this document with the actual manifest path(s), language version pins, and primary frameworks.
