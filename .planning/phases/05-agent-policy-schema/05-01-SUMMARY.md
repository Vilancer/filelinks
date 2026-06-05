---
phase: 05-agent-policy-schema
plan: 01
completed: 2026-05-31
---

# 05-01 Summary

**One-liner:** AGENT-01 — `AgentRunPolicySchema` (`trigger-or-affects` only), optional `agent` on config/entry, `resolveAgentRunPolicy` with per-link → global → default merge.

**Verified:** `pnpm exec nx run core:test --skip-nx-cache`, `core:build --skip-nx-cache`.

**Key files:** `packages/core/src/lib/schema.ts`, `agentRunPolicy.ts`, `agentRunPolicy.spec.ts`, `schema.spec.ts`.
