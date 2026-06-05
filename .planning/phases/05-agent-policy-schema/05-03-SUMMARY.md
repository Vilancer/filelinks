---
phase: 05-agent-policy-schema
plan: 03
completed: 2026-05-31
---

# 05-03 Summary

**One-liner:** AGENT-03 — `shouldRunAgentForLink` gates on `trigger-or-affects` using `StagedLinkCoverage`; integration test for affect-only staging vs empty `matchStagedLinks`.

**Verified:** `pnpm exec nx run core:test --skip-nx-cache`, `core:build --skip-nx-cache`.

**Key files:** `packages/core/src/lib/agentRunPolicy.ts`, `agentRunPolicy.spec.ts`.
