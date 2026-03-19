# bstack Package Context

## Package Identity

- npm package: `@kryshtop/bstack`
- CLI binary: `bstack`
- primary domain: BrowserStack App Automate management
- package style: CLI-first, with SDK exports available for programmatic use

## Current Environment Variable Names

- `BSTACK_USERNAME`
- `BSTACK_ACCESS_KEY`
- `BSTACK_MASTER_KEY`
- `BSTACK_BASE_URL`
- `BSTACK_HTTP_TIMEOUT_MS`

Use these names consistently in code, docs, examples, and prompts.

## User-Facing Command Pattern

Use:

```bash
bstack auth login
bstack auth status
bstack appium apps list
bstack media upload ./file.png
```

Do not regress to older names such as `bsaa` or `bs-cli`.

## Install and Import Pattern

Recommended CLI installation:

```bash
npm install -g @kryshtop/bstack
```

Pinned repo-local CLI installation:

```bash
npm install -D @kryshtop/bstack
```

SDK import:

```ts
import { EndpointRegistry } from '@kryshtop/bstack';
```

## Important Maintenance Pitfalls

- npm scope must match the actual npm username or org exactly.
- GitHub repo slug and README badge URLs must match the current repository name.
- Publish failures often come from npm token scope, token type, or 2FA policy rather than code defects.
- For auth-sensitive tasks, confirm `BSTACK_USERNAME` and `BSTACK_ACCESS_KEY` before assuming live API access is possible.

