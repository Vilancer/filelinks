---
status: passed
phase: 01-core-library
verified_at: 2026-04-02
---

# Phase 1 verification: Core library

## Goal

`@filelinks/core` delivers Step 2 (schema, `defineLinks`, `resolvePrompt`) and Step 3 (`jiti` config load, git staged paths, `minimatch` link matching) per `01-CONTEXT.md` and `ROADMAP.md`.

## Requirements traceability

| ID | Evidence |
|----|----------|
| CORE-01 | `defineLinks` + `schema.spec.ts` |
| CORE-02 | `loadFileLinksConfig` + `configLoader.spec.ts` (fixture `defineLinks` default export) |
| CORE-03 | `getGitRepoRoot` / `getStagedFilePaths` + `gitReader.spec.ts` (mocked `execFileSync`) |
| CORE-04 | `matchStagedLinks` + `linkMatcher.spec.ts` (missing affected case) |
| CORE-05 | `resolvePrompt` + `promptResolver.spec.ts` |

## Automated checks

- `pnpm exec nx run core:build` — pass (2026-04-02)
- `pnpm exec nx run core:test` — pass; 12 tests across schema, prompt resolver, config loader, git reader, link matcher

## Must-haves (plan frontmatter)

- `defineLinks` omits config → `config: {}` — covered in `schema.spec.ts`
- `resolvePrompt` merge order — covered in `promptResolver.spec.ts`
- `loadFileLinksConfig` returns `{ links, config }` from loaded `filelinks.config.ts` — `configLoader.spec.ts`
- `getStagedFilePaths` uses `-z` parsing — `gitReader.spec.ts` + implementation
- `matchStagedLinks` reports missing affected when trigger matches — `linkMatcher.spec.ts`

## Gaps

None identified.

## Human verification

None required for this phase (library-only, fully covered by unit tests).
