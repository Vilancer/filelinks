# Architecture

**Snapshot:** There is **no executable architecture** in the repository yet—no modules, entry points, or runtime boundaries. This section reflects the **stated product intent** from `README.md` and what that implies for future design.

## Product intent

From `README.md`:

- **filelinks** should be a **language-agnostic** way to declare **semantic relationships between files**.
- Consumers include **AI agents**, **git hooks**, and **editors**, which need to know **what to check when something changes**.

## Implied architectural concerns (future)

When implemented, the system will likely need:

1. **A declarative format** — how relationships are stored (e.g. config file(s), embedded metadata, or a small DSL).
2. **Resolution** — mapping from a changed file to related files or checks.
3. **Tooling surfaces** — libraries or CLIs for hooks and editor extensions; possibly an LSP or simple parser.

## Current layers

| Layer | Present? | Notes |
|--------|----------|--------|
| Entry point (CLI, library) | No | No `src/`, `cmd/`, or `main` |
| Domain model | No | No types or schemas checked in |
| Persistence | No | N/A |
| External I/O | No | See `INTEGRATIONS.md` |

## Data flow

- **Not applicable** until code exists. Expected future flow (conceptual): **change event** → **lookup relationships** → **notify or run checks** on related files.

## Abstractions

- None in code. Future abstractions might include: **link graph**, **adapter per ecosystem** (optional), **plugin or hook contract**.

## Entry points (current)

- **Documentation only:** `README.md` describes scope; `LICENSE` governs distribution.
- **No runtime entry point** (no `package.json` `bin`, no `main` in any language).

## Summary

The repository is **pre-architecture**: vision is documented, implementation is not. After the first manifest and source layout land, rewrite this document with actual modules, boundaries, and a short diagram if helpful.
