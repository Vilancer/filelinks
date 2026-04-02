# Concerns, risks, and technical debt

**Snapshot:** The repository is **greenfield**—risks are mostly **delivery and design** rather than legacy code.

## Product and design uncertainty

- **Format not specified:** How file relationships are declared (single config, multiple files, syntax) will drive complexity and adoption.
- **Consumer parity:** Supporting agents, git hooks, and editors may require multiple adapters or a stable core library—scope creep risk.

## Security

- **No attack surface in code** — nothing deployed or executed from this repo yet.
- **Future:** Parsing user-supplied config or traversing repositories must avoid path traversal and arbitrary command execution; validate inputs and document threat model when a CLI exists.

## Operational

- **No CI:** No automated checks for regressions, licenses, or supply chain when dependencies are added.
- **No release process:** Versioning and publishing undefined.

## Performance

- **N/A** for empty codebase. Future graph resolution over large monorepos may need caching or incremental updates—track when benchmarks become relevant.

## Fragile areas

- **None in code.** The only durable artifacts are `README.md`, `LICENSE`, and `.gitignore`; avoid drifting `.gitignore` from actual toolchain to reduce noise.

## Technical debt

- **None accumulated** — no shortcuts in implementation because there is no implementation.

## Monitoring and observability

- **Not applicable** until a service or long-running tool exists.

## Summary

| Category | Level | Notes |
|----------|--------|--------|
| Security (current) | Low | No runtime |
| Maintainability | N/A | No code |
| Test coverage | None | See `TESTING.md` |
| CI/CD | Absent | Add with first code |

Revisit after the first milestone of working code and dependencies.
