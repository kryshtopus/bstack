# bstack

BrowserStack App Automate SDK and CLI for uploads, builds, sessions, and media workflows.

[![Build](https://img.shields.io/github/actions/workflow/status/kryshtopus/browserstack-cli-client/build.yml?branch=main&style=flat-square&label=build)](https://github.com/kryshtopus/browserstack-cli-client/actions/workflows/build.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/kryshtopus/browserstack-cli-client/unit-tests.yml?branch=main&style=flat-square&label=tests)](https://github.com/kryshtopus/browserstack-cli-client/actions/workflows/unit-tests.yml)
[![Version](https://img.shields.io/github/package-json/v/kryshtopus/browserstack-cli-client?style=flat-square)](https://github.com/kryshtopus/browserstack-cli-client/blob/main/package.json)
[![GitHub Stars](https://img.shields.io/github/stars/kryshtopus/browserstack-cli-client?style=flat-square)](https://github.com/kryshtopus/browserstack-cli-client/stargazers)
[![License](https://img.shields.io/github/license/kryshtopus/browserstack-cli-client?style=flat-square)](https://github.com/kryshtopus/browserstack-cli-client/blob/main/LICENSE)

`@kryshtopus/bstack` is a CLI-first BrowserStack App Automate package that ships both:

- a CLI binary: `bstack`
- a TypeScript/JavaScript SDK for registry-driven BrowserStack App Automate API access

It is designed for local operator workflows and CI scripting. In most cases you should install it globally, or as a project-local `devDependency` when you want a pinned CLI version inside a repository. The package also exposes an SDK surface for advanced programmatic use, but it is primarily intended as an operator utility rather than a runtime dependency of application packages.

## Features

- Interactive terminal UI for common BrowserStack App Automate workflows
- Scriptable command mode for CI and shell automation
- SDK exports for HTTP client, registry, services, normalizers, and types
- Local credential persistence with OS keychain preference

## Requirements

- Node.js `>=22.20.0`
- npm `>=10`

## Installation

### Recommended: global CLI usage

```bash
npm install -g @kryshtopus/bstack
bstack --help
```

### Project-local CLI usage

```bash
npm install -D @kryshtopus/bstack
npx bstack --help
```

### From a local tarball

```bash
npm pack
npm install -D ./kryshtopus-bstack-1.0.0.tgz
```

## Quick Start

### CLI

```bash
bstack auth login
bstack auth status
bstack appium apps list
```

If installed locally instead of globally:

```bash
npx @kryshtopus/bstack --help
```

### SDK

If you intentionally want to use the package programmatically, install it in the way that matches your project policy. For CLI-only use, prefer the global or `devDependency` installs above.

```ts
import {
  BrowserStackHttpClient,
  EndpointRegistry,
  ResourceService,
  endpointDefinitions,
} from '@kryshtopus/bstack';

const registry = new EndpointRegistry(endpointDefinitions);
const http = new BrowserStackHttpClient({
  username: process.env.BSAA_USERNAME!,
  accessKey: process.env.BSAA_ACCESS_KEY!,
  storageStrategy: 'plain-file',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const service = new ResourceService(registry, http);
const builds = await service.listBuilds('appium');
console.log(builds);
```

## CLI Usage

### Interactive mode

Run with no subcommand:

```bash
bstack
```

or explicitly:

```bash
bstack menu
```

### Command mode

Global options:

- `--json`
- `--debug-http`
- `--verbose`
- `--master-key <key>`
- `--allow-plain-storage`
- `--base-url <url>`

Examples:

```bash
bstack auth login
bstack auth validate
bstack auth status --json
bstack appium apps upload ./MyApp.apk --custom-id SampleApp
bstack appium builds list --status running
bstack maestro suites upload ./maestro-suite.zip
bstack xcuitest sessions get <sessionId> --build <buildId>
bstack media upload ./fixtures/profile.png
bstack explorer
```

## SDK Exports

The package root exports:

- `AuthService`
- `BrowserStackHttpClient`
- `BrowserStackApiError`
- `buildMultipartPayload`
- `EndpointRegistry`
- `endpointDefinitions`
- `ResourceService`
- `frameworkDescriptors`
- `getFrameworkDescriptor`
- `validateUploadPath`
- `CommandRuntime`
- `createProgram`
- `runCli`
- config path helpers
- normalizers
- public domain types

Internal implementation files are not exported through the package root.

## Authentication

The CLI uses BrowserStack username and access key.

Supported sources:

- interactive prompt
- explicit CLI flags
- environment variables you provide in your shell or CI

### Login examples

Interactive:

```bash
bstack auth login
```

Non-interactive:

```bash
bstack auth login --username "$BSAA_USERNAME" --access-key "$BSAA_ACCESS_KEY"
```

Encrypted local storage:

```bash
export BSAA_MASTER_KEY='choose-a-strong-local-master-key'
bstack auth login \
  --username "$BSAA_USERNAME" \
  --access-key "$BSAA_ACCESS_KEY" \
  --storage encrypted-file
```

Plain-text storage is explicit only:

```bash
bstack auth login \
  --username "$BSAA_USERNAME" \
  --access-key "$BSAA_ACCESS_KEY" \
  --storage plain-file \
  --allow-plain-storage
```

## Environment Variables

See [.env.example](./.env.example).

Supported variables:

- `BSAA_USERNAME`
- `BSAA_ACCESS_KEY`
- `BSAA_MASTER_KEY`
- `BSAA_BASE_URL`
- `BSAA_HTTP_TIMEOUT_MS`

## Credential and Session Storage

Credentials are stored outside the repository root.

Storage order for `--storage auto`:

1. OS keychain via optional `keytar`
2. encrypted file using your master key
3. plain-text file only if you explicitly allow it

Typical user config locations:

- macOS: `~/Library/Application Support/bstack`
- Linux: `~/.config/bstack`

Persisted files may include:

- `config.json`
- `session.enc`
- `session.json`
- `last-response.json`

Secrets are not bundled into the npm package.

## Framework Coverage

### Appium

- apps: upload, list, group list, delete
- builds: list, get
- sessions: list, get, update status
- plan and usage validation

### Maestro

- apps: upload, list, get, delete
- test suites: upload, list, get, delete
- builds: run, list, get, stop
- sessions: get

### Espresso

- apps: upload, list, get, delete
- test suites: upload, list, get, delete
- builds: run, list, get, stop
- sessions: get

### Flutter Android

- apps: upload, list, get, delete
- test suites: upload, list, get, delete
- builds: run, list, get, stop
- sessions: get

### Flutter iOS

- test packages: upload, list, get, delete
- builds: run, list, get, stop
- sessions: get

### Detox Android

- apps: upload
- app-client: upload
- sessions: get

### XCUITest

- apps: upload, list, get, delete
- test suites: upload, list, get, delete
- builds: run, list, get, stop
- sessions: get

### Media

- upload, list, group list, delete

## Media Notes

Media uploads return BrowserStack `media_url` values that you can plug into framework-specific execution payloads or capabilities.

The package preserves raw BrowserStack responses instead of forcing a guessed capability abstraction.

## Troubleshooting

### No saved session found

```bash
bstack auth login
```

### Keychain support unavailable

Use encrypted-file storage with a master key:

```bash
bstack auth login --storage encrypted-file --master-key '<key>'
```

### Encrypted session cannot be decrypted

Set the same `BSAA_MASTER_KEY` used when the session was created, or log in again and choose another storage backend.

### Unsupported operation

The requested command may not be available for that framework. Check `bstack help-frameworks` to see the currently supported operations.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=kryshtopus/browserstack-cli-client&type=Date)](https://www.star-history.com/#kryshtopus/browserstack-cli-client&Date)
