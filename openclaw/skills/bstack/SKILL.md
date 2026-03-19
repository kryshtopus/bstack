---
name: bstack
description: Work with the @kryshtop/bstack BrowserStack App Automate CLI and SDK. Use when operating BrowserStack uploads, builds, sessions, media, auth flows, package publishing, README/docs, GitHub Actions, npm metadata, or environment-variable setup for this tool. Also use when a task mentions the bstack CLI, @kryshtop/bstack, BrowserStack App Automate management, or BSTACK_* environment variables.
---

# bstack

Use this skill when the task is about the `@kryshtop/bstack` package or the `bstack` CLI.

## Start Here

1. Confirm whether the user wants CLI usage, SDK usage, package maintenance, or release/publishing work.
2. Request the relevant environment variables before doing auth-sensitive work.
3. Read [references/package-context.md](references/package-context.md) for the current package identity, command surface, and workflow conventions.
4. If a task depends on BrowserStack auth, verify whether the required `BSTACK_*` variables are present.
5. Prefer the documented public entrypoints:
   - npm package: `@kryshtop/bstack`
   - CLI binary: `bstack`

## Required Environment Variables

For any live BrowserStack operation, explicitly ask for or verify these variables:

- `BSTACK_USERNAME`
- `BSTACK_ACCESS_KEY`

Request these when relevant:

- `BSTACK_MASTER_KEY` for encrypted local credential storage
- `BSTACK_BASE_URL` when the user needs a non-default API base URL
- `BSTACK_HTTP_TIMEOUT_MS` when network timeout tuning matters

If the variables are missing, ask the user to provide them or confirm that the task should remain offline and code-only.

Use `openclaw/skills/bstack/scripts/check-env.sh` when a shell-based env check is helpful.

## Operating Rules

- Treat `bstack` as the user-facing command name everywhere.
- Treat `@kryshtop/bstack` as the npm install/import name everywhere.
- Prefer `npm install -g @kryshtop/bstack` for human CLI usage.
- Prefer `npm install -D @kryshtop/bstack` for repo-local CLI pinning.
- Only recommend runtime dependency installation when the user explicitly wants SDK embedding.
- Keep README guidance user-facing; do not mix maintainer-only release instructions into consumer docs.
- When touching GitHub Actions publish logic, assume npm token publishing is in use unless the user explicitly asks for Trusted Publishing.

## Common Task Patterns

### CLI and auth help

- Validate command examples against the real binary form: `bstack auth login`, `bstack appium apps list`, `bstack media upload ...`
- If auth is involved, ask for `BSTACK_USERNAME` and `BSTACK_ACCESS_KEY` first.
- Preserve `BSTACK_*` naming in docs, examples, and code.

### Package and release work

- Keep `package.json` metadata aligned with the current npm scope and repo slug.
- For npm publication issues, check scope mismatches, token permissions, and publish workflow assumptions before changing code broadly.
- When the problem is a CI publish failure, inspect both `.github/workflows/` and package metadata.

### Documentation work

- Keep the README concise and user-facing.
- Ensure install commands use `@kryshtop/bstack` and runtime commands use `bstack`.
- Keep badges and links aligned with the current GitHub repo slug.

## References

- Load [references/package-context.md](references/package-context.md) for current package identity, env names, and common pitfalls.

