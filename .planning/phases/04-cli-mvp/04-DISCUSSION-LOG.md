# Phase 4: CLI MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in **04-CONTEXT.md**.

**Date:** 2026-04-05  
**Phase:** 4 — CLI MVP  
**Areas discussed:** `check` exit policy & severity; Human vs `--json` output; `add` interaction & file writes; Global flags & config path

---

## `check` exit codes & severity

| Option | Description                                                                               | Selected |
| ------ | ----------------------------------------------------------------------------------------- | -------- |
| A      | Omitted `severity` defaults to `warn`; only explicit `error` fails the run for violations | ✓        |
| B      | Omitted `severity` defaults to `error`                                                    |          |
| C      | Any violation fails the run regardless of severity                                        |          |

**User's choice:** Discussed all areas; **A** locked (matches CLI-01 example and avoids breaking configs without `severity`).

**Notes:** Fail-fast for config/git/runtime errors (**exit 1**). **Exit 0** when no error-severity link violations.

---

## Human vs machine output (`check` / `list`)

| Option | Description                                                                      | Selected |
| ------ | -------------------------------------------------------------------------------- | -------- |
| A      | Human text to stdout; errors to stderr; optional `--json` for `check` and `list` | ✓        |
| B      | Human text only; no JSON in MVP                                                  |          |

**User's choice:** **A** — JSON optional for CI.

**Notes:** `list` table includes **`linkType`** when set; one row per **affect** for multi-affect links (**D-07** in CONTEXT).

---

## `filelinks add` workflow

| Option | Description                                                                                     | Selected |
| ------ | ----------------------------------------------------------------------------------------------- | -------- |
| A      | Interactive multi-step; create minimal file if missing; append link if possible; fail if unsafe | ✓        |
| B      | Print snippet only; user copies manually                                                        |          |

**User's choice:** **A** per CLI-03 (append or write file).

**Notes:** Prompt library and edit strategy left to planner/implementer within safety constraints.

---

## Global CLI surface (flags, `--config`, bin)

| Option | Description                                                                                         | Selected |
| ------ | --------------------------------------------------------------------------------------------------- | -------- |
| A      | `--cwd`, `--config`, `--version`/`-V`, optional `--verbose`; explicit config path supported in core | ✓        |
| B      | Discovery only; no `--config` in MVP                                                                |          |

**User's choice:** **A**.

**Notes:** **`--config`** implies extending **`loadFileLinksConfig`** (or sibling API) to load a **specific file path**.

---

## Claude's Discretion

- Table formatting, JSON field names, colors, exact Commander layout, **`add`** edit implementation.

## Deferred Ideas

_None recorded in this session._
