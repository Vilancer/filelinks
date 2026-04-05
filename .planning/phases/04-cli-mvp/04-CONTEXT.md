# Phase 4: CLI MVP - Context

**Gathered:** 2026-04-05  
**Status:** Ready for planning

<domain>

## Phase Boundary

Ship the **`filelinks`** CLI (**Commander**): **`check`** (staged paths + matcher + policy exit codes), **`list`** (declared links in a readable table, **`linkType`** when set), **`add`** (interactive collection of trigger / affects / reason / severity and **append or create** `filelinks.config.ts`). Expose **`bin`** for **`npx filelinks`** after publish and satisfy **DOC-01** (install, minimal config example, command usage). Scope is **CLI + package metadata + README**; **not** git-hook package, graph, AI, or editor.

</domain>

<decisions>

## Implementation Decisions

### `check` — exit codes & severity (CLI-01)

- **D-01:** **`severity` omitted** on a link **defaults to `warn`** when deciding whether a violation fails the run (only explicit **`error`** causes a non-zero exit for **link-policy** violations).
- **D-02:** Exit **`1`** when the command cannot complete successfully: **config** missing/invalid/export shape/validation; **git** operations fail (e.g. not a git repo); or **normalizeError** / unexpected failures after attempted handling.
- **D-03:** Exit **`1`** when **`check` completes** and **any** triggered link has **missing affected files** and **effective severity is `error`**.
- **D-04:** Exit **`0`** when there are **no error-severity violations** (including: **warnings-only** violations, **no triggers**, **no missing companions**).
- **D-05:** **Warning-severity** violations **must still be reported** when present; they **do not** by themselves force a non-zero exit.

### Human vs machine output (`check` / `list`) (CLI-02, DOC-01)

- **D-06:** Default output is **human-readable text** to **stdout** for **`list`** and for **`check`** findings; **fatal errors** (failed run) go to **stderr** with a clear message derived from **`normalizeError`** / **`HandledFailure`**.
- **D-07:** **`list`**: **table** with columns including **Trigger**, **Affected** (all targets — e.g. comma-separated or wrapped), **Reason** (per row policy below), **Severity** (effective), **`linkType`** (blank or `—` when unset). If one link has **multiple** affects, use **one row per affect** (repeat trigger) so the table stays scannable.
- **D-08:** **`check`**: For each problem, print enough context to act (**which trigger**, **which affected path**, **reason**, **severity**).
- **D-09:** Support **`--json`** on **`check`** and **`list`** (global or per-command — implementer choice) producing **structured JSON** suitable for CI (exact shape is **Claude’s discretion**, but must be stable and documented in README).

### `filelinks add` (CLI-03)

- **D-10:** **Interactive** prompts collect: **trigger**; **one or more** `{ file, reason }` pairs (loop until done); **`severity`**; optional **`linkType`**.
- **D-11:** If **`filelinks.config.ts` is missing**, **create** a valid minimal file (default export **`defineLinks([...], {})`** pattern consistent with **`loadFileLinksConfig`**).
- **D-12:** If the file **exists**, **append** a new link entry to the declared links **without corrupting** the file; if a safe edit cannot be performed, **fail with a clear error** (do not write a broken file).
- **D-13:** Prompt/UX library (readline vs small prompt helper) is **Claude’s discretion**; prefer **minimal new dependencies** unless justified in planning.

### Global CLI surface (discovery, flags, bin) (CLI-04, DOC-01)

- **D-14:** **`--cwd <dir>`** sets the working directory for **config discovery** and **git** (default **`process.cwd()`**).
- **D-15:** **`--config <path>`** forces loading **that** `filelinks.config.ts` (or equivalent) **instead of** walking upward from `--cwd` — requires **core** support for an **explicit config path** in addition to **`findConfigFile(startDir)`** (new API or overload is in scope for Phase 4).
- **D-16:** **`--version` / `-V`** prints the **`filelinks`** package version; **`--verbose`** (optional for MVP) may print extra diagnostics.
- **D-17:** **`bin`** in **`packages/cli/package.json`** points at the **built** entry (document **local** usage: `pnpm exec nx run filelinks:build` / `node` path as per CONTRIBUTING patterns).

### Error handling (carried from Phase 3)

- **D-18:** CLI boundaries use **`normalizeError(unknown)`** (or equivalent) for failures and map **`HandledFailure.code`** to **exit code `1`** and user-facing **stderr** text; **no uncaught throws** from the CLI entry.

### Claude’s Discretion

- Exact **Commander** nesting, **help** text, and **option names** beyond the above.
- **`--json`** schema and **pretty-printing** vs one-line JSON.
- **Table** formatting (fixed width vs tabs), **ANSI colors** (if any), and **`--no-color`** behavior.
- **Implementation strategy** for **`add`** file edits (AST vs constrained string edit) subject to **D-11–D-12**.

### Folded Todos

_None — no matching pending todos for this phase._

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product & planning

- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, CLI scope
- `.planning/REQUIREMENTS.md` — **CLI-01**–**CLI-04**, **DOC-01**
- `.planning/PROJECT.md` — MVP ordering, stack constraints

### Prior phase context

- `.planning/phases/03-core-effect-typed-errors/03-CONTEXT.md` — **Effect Schema**, **`FilelinksError`**, **`normalizeError`** / **`HandledFailure`**
- `.planning/phases/01-core-library/01-CONTEXT.md` — **`defineLinks`**, config authoring shape
- `.planning/phases/02-core-link-types-repo-dx/02-CONTEXT.md` — **`linkType`** semantics (metadata; matcher unchanged)

### Product doc

- `docs/filelinks-docs.docx` — CLI commands and phased roadmap (source product spec)

### Code (integration points)

- `packages/core/src/lib/configLoader.ts` — **`findConfigFile`**, **`loadFileLinksConfig`** (extend for **`--config`** per **D-15**)
- `packages/core/src/lib/gitReader.ts` — **staged paths**, repo root
- `packages/core/src/lib/linkMatcher.ts` — **`matchStagedLinks`**
- `packages/core/src/lib/handleError.ts` — **`normalizeError`**
- `packages/core/src/lib/schema.ts` — optional **`severity`**, **`linkType`**
- `.planning/codebase/ARCHITECTURE.md` — package roles and data flow

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable assets

- **`loadFileLinksConfig`**, **`findConfigFile`**, **`getStagedFilePaths`**, **`getGitRepoRoot`**, **`matchStagedLinks`**, **`normalizeError`** — primary CLI integration surface.
- **`defineLinks`** — template for **`add`**-generated config.

### Established patterns

- **Nx** + **Vitest** for `packages/cli`; mirror **`packages/core`** project layout.
- Config on disk is **`filelinks.config.ts`** with **default export** shape expected by **`loadFileLinksConfig`**.

### Integration points

- CLI **`check`**: load config → staged paths → **`matchStagedLinks`** → severity/exit policy → print.
- CLI **`list`**: load config → print **links** (and **global `config`** if worth showing — **optional**, not required by v1 table).

</code_context>

<specifics>

## Specific Ideas

- User chose to discuss **all four** gray areas in one pass; decisions above use the **recommended defaults** from that discussion (aligned with **CLI-01** wording and Phase 3 **`HandledFailure`**).

</specifics>

<deferred>

## Deferred Ideas

- **`@filelinks/git-hook`**, **`suggest`**, **`graph`**, **VS Code**, **Nx plugin** — per **`REQUIREMENTS.md`** v2 / **PROJECT.md** Out of Scope.

### Reviewed Todos (not folded)

_None._

**None — discussion stayed within phase scope**

</deferred>

---

_Phase: 04-cli-mvp_  
_Context gathered: 2026-04-05_
