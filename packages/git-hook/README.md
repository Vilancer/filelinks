# @vilancer/filelinks-git-hook

Run **`filelinks check`** automatically on every commit. This package ships the **`filelinks-git-hook`** binary, which installs a small, idempotent block into your git `pre-commit` hook — plain `.git/hooks` or [husky](https://typicode.github.io/husky/).

## Install

```bash
pnpm add -D @vilancer/filelinks @vilancer/filelinks-core @vilancer/filelinks-git-hook
# or: npm install --save-dev @vilancer/filelinks @vilancer/filelinks-core @vilancer/filelinks-git-hook
```

You also need a `filelinks.config.ts` (run `filelinks add` to create one).

## Plain git hooks

```bash
npx filelinks-git-hook install
```

This writes (or appends to) the hook at `git rev-parse --git-path hooks`/`pre-commit` — so worktrees and `core.hooksPath` are respected — and makes it executable:

```sh
# >>> filelinks >>>
if [ "$FILELINKS_SKIP" != "1" ]; then
  npx --no-install filelinks-git-hook run || exit $?
fi
# <<< filelinks <<<
```

Re-running `install` replaces the block in place; anything else in the hook is left alone.

| Option            | Default                                   | Meaning                       |
| ----------------- | ----------------------------------------- | ----------------------------- |
| `--hook <name>`   | `pre-commit`                              | Which git hook to write       |
| `--command <cmd>` | `npx --no-install filelinks-git-hook run` | Command inside the block      |
| `--husky`         | auto                                      | Write to `.husky/<hook>`      |
| `--cwd <dir>`     | current dir                               | Any directory inside the repo |

## Husky (v9)

```bash
npx husky init                          # creates .husky/pre-commit
npx filelinks-git-hook install --husky  # appends the filelinks block
```

If a `.husky/` directory already exists at the repo root, `install` targets it automatically. Prefer to do it by hand? Add one line to `.husky/pre-commit`:

```sh
npx --no-install filelinks check
```

## lint-staged

lint-staged appends the matched file paths to each command. `filelinks check` reads the **staged set from git itself**, so use the function form — it runs once, with no file arguments:

```js
// lint-staged.config.mjs
export default {
  '*.{ts,tsx}': 'eslint --fix',
  '*': () => 'filelinks check',
};
```

Then keep `npx lint-staged` in your hook (for example `.husky/pre-commit`). Use either this or the `install` block, not both.

## `run`

The hook calls `filelinks-git-hook run`, which runs `filelinks check` in-process and exits with its code:

```bash
filelinks-git-hook run [--cwd <dir>] [--config <path>] [--run-agents] [--json]
```

## Skipping a commit check

```bash
FILELINKS_SKIP=1 git commit -m "wip"   # skip filelinks only
git commit --no-verify -m "wip"        # skip all hooks
```

## AI agents on commit

Agents are opt-in. Install the hook with a custom command:

```bash
npx filelinks-git-hook install --command "npx --no-install filelinks-git-hook run --run-agents"
```

`CURSOR_API_KEY` must be available to the hook (env or `.env.local`).

## Uninstall

```bash
npx filelinks-git-hook uninstall            # or: --husky / --hook <name>
```

Removes the block; if only a shebang is left, the hook file is deleted.

## Related packages

| Package                                   | npm                                                               | Role                                   |
| ----------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| **`@vilancer/filelinks`**                 | [npm](https://www.npmjs.com/package/@vilancer/filelinks)          | CLI binary                             |
| **`@vilancer/filelinks-core`**            | [npm](https://www.npmjs.com/package/@vilancer/filelinks-core)     | `defineLinks`, matching, agent helpers |
| **`@vilancer/filelinks-git-hook`** (this) | [npm](https://www.npmjs.com/package/@vilancer/filelinks-git-hook) | git / husky hook installer             |

Full docs: [github.com/Vilancer/filelinks](https://github.com/Vilancer/filelinks).
