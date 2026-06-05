# Phase 5 verification — Agent policy & schema

**Date:** 2026-05-31  
**Requirements:** AGENT-01, AGENT-02, AGENT-03

## Summary

Core exposes agent run policy on config and entries (`trigger-or-affects` only), `resolveAgentRunPolicy`, `classifyStagedLinks` / `StagedLinkCoverage`, and `shouldRunAgentForLink`. `matchStagedLinks` behavior unchanged (existing specs green).

## Commands run

| Command                                       | Result            |
| --------------------------------------------- | ----------------- |
| `pnpm exec nx run core:test --skip-nx-cache`  | Exit 0 (50 tests) |
| `pnpm exec nx run core:build --skip-nx-cache` | Exit 0            |

## AGENT-01

| Check                                                                | Pass |
| -------------------------------------------------------------------- | ---- |
| `AgentRunPolicySchema` literal `trigger-or-affects` only             | ✓    |
| `agent` optional on `FileLinkConfigSchema` and `FileLinkEntrySchema` | ✓    |
| Invalid `runPolicy` fails `defineLinks` decode (`schema.spec.ts`)    | ✓    |
| `resolveAgentRunPolicy` per-link → global → default                  | ✓    |

## AGENT-02

| Check                                                           | Pass |
| --------------------------------------------------------------- | ---- |
| `export function stagedCoversAffected` in `linkMatcher.ts`      | ✓    |
| `classifyStagedLinks` returns one row per link                  | ✓    |
| Trigger/affect paths + `missingAffected` when in play           | ✓    |
| Affect-only staging: coverage true, `matchStagedLinks` length 0 | ✓    |
| `linkMatcher.spec.ts` unchanged behavior                        | ✓    |

## AGENT-03

| Check                                                            | Pass |
| ---------------------------------------------------------------- | ---- |
| `shouldRunAgentForLink` uses `triggerMatched \|\| affectMatched` | ✓    |
| False when neither side matched                                  | ✓    |
| Integration: classify + resolve + gate for affect-only           | ✓    |

## Sign-off

**status:** passed

Proceed to **Phase 6 — Provider system & Cursor SDK**.
