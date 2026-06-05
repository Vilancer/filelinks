---
phase: 03-core-effect-typed-errors
plan: 01
subsystem: core
tags: [effect, schema, typescript, errors]

requires:
  - phase: 01-core-library
    provides: defineLinks, matcher, config loader baseline
provides:
  - Effect Schema as source of truth for config types
  - Typed FilelinksError hierarchy + normalizeError
  - Decoded config loading with ConfigValidationError on schema failure
affects:
  - Phase 4 CLI MVP

tech-stack:
  added: [effect@^3.21.0]
  patterns:
    - Schema.Schema.Type for public TS types from schema values
    - isParseError from effect/ParseResult for error normalization

key-files:
  created:
    - packages/core/src/lib/errors.ts
    - packages/core/src/lib/handleError.ts
    - packages/core/src/lib/handleError.spec.ts
    - packages/core/src/lib/__fixtures__/invalid-schema-config/filelinks.config.ts
  modified:
    - packages/core/src/lib/schema.ts
    - packages/core/src/lib/configLoader.ts
    - packages/core/src/lib/linkType.ts
    - packages/core/src/index.ts
    - packages/core/package.json
    - pnpm-lock.yaml

key-decisions:
  - 'Use Schema.decodeUnknownSync in defineLinks and loader; clone with spread for mutable output types.'
  - 'normalizeError uses isParseError (not ParseError.isParseError) for ESM/Vitest compatibility.'

patterns-established:
  - 'Central failure normalization: normalizeError(unknown) -> HandledFailure'

requirements-completed: [CORE-07, CORE-08, CORE-09]

duration: inline
completed: 2026-04-05
---

# Phase 3: Core — Effect & typed errors — Plan 01 Summary

**Core library now validates config with Effect Schema and routes failures through a single structured error handler.**

## Performance

- **Tasks:** 9 (executed inline)
- **Files modified:** see plan frontmatter

## Accomplishments

- Added **effect** and replaced hand-written interfaces with **Schema** + **Schema.Schema.Type** aliases.
- Implemented **FilelinksError** subclasses and refactored **configLoader** to throw them; schema decode failures become **ConfigValidationError** with **ParseError** cause.
- Added **normalizeError** with full test coverage.

## Files Created/Modified

- See `key-files` in frontmatter above.

## Follow-ups

- Phase 4 CLI can import `normalizeError` for exit codes and stderr.
- Optional: document Effect dependency in `.planning/codebase/STACK.md` or `ARCHITECTURE.md` in a later docs pass.
