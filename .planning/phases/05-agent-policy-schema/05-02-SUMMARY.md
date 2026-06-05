---
phase: 05-agent-policy-schema
plan: 02
completed: 2026-05-31
---

# 05-02 Summary

**One-liner:** AGENT-02 — `classifyStagedLinks` / `StagedLinkCoverage` with per-link rows, trigger/affect path lists, `missingAffected` when in play; exported `stagedCoversAffected` from linkMatcher.

**Verified:** `pnpm exec nx run core:test --skip-nx-cache`.

**Key files:** `stagedClassifier.ts`, `stagedClassifier.spec.ts`, `linkMatcher.ts`.
