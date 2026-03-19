# browserstack-app-automate-cli

`browserstack-app-automate-cli` is an ESM-first BrowserStack App Automate package that ships both:

- a CLI binary: `bsaa`
- a TypeScript/JavaScript SDK for registry-driven BrowserStack App Automate API access

It is designed for local operator workflows, CI scripting, and library consumption from Node.js projects.

## Features

- Interactive terminal UI for common BrowserStack App Automate workflows
- Scriptable command mode for CI and shell automation
- SDK exports for HTTP client, registry, services, normalizers, and types
- Local credential persistence with OS keychain preference
- Safe npm packaging with dist-only publish output
- Local tarball validation for pre-publish checks

## Requirements

- Node.js `>=22.20.0`
- npm `>=10`

## Installation

### Library / local CLI usage

```bash
npm install browserstack-app-automate-cli
```

### Global CLI usage

```bash
npm install -g browserstack-app-automate-cli
bsaa --help
```

### From a local tarball

```bash
npm pack
npm install ./browserstack-app-automate-cli-1.0.0.tgz
```

## Quick Start

### CLI

```bash
bsaa auth login
bsaa auth status
bsaa appium apps list
```

If installed locally instead of globally:

```bash
npx bsaa --help
```

### SDK

```ts
import {
  BrowserStackHttpClient,
  EndpointRegistry,
  ResourceService,
  endpointDefinitions,
} from 'browserstack-app-automate-cli';

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
bsaa
```

or explicitly:

```bash
bsaa menu
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
bsaa auth login
bsaa auth validate
bsaa auth status --json
bsaa appium apps upload ./MyApp.apk --custom-id SampleApp
bsaa appium builds list --status running
bsaa maestro suites upload ./maestro-suite.zip
bsaa xcuitest sessions get <sessionId> --build <buildId>
bsaa media upload ./fixtures/profile.png
bsaa explorer
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
bsaa auth login
```

Non-interactive:

```bash
bsaa auth login --username "$BSAA_USERNAME" --access-key "$BSAA_ACCESS_KEY"
```

Encrypted local storage:

```bash
export BSAA_MASTER_KEY='choose-a-strong-local-master-key'
bsaa auth login \
  --username "$BSAA_USERNAME" \
  --access-key "$BSAA_ACCESS_KEY" \
  --storage encrypted-file
```

Plain-text storage is explicit only:

```bash
bsaa auth login \
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

- macOS: `~/Library/Application Support/browserstack-app-automate-cli`
- Linux: `~/.config/browserstack-app-automate-cli`

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

## Development

Install dependencies:

```bash
npm install
```

Useful commands:

```bash
npm run clean
npm run typecheck
npm run lint
npm test
npm run build
npm run pack:check
```

Local development CLI:

```bash
npm run dev -- --help
```

## Testing

Current automated checks cover:

- auth header generation
- session persistence
- endpoint registry resolution
- query parameter building
- multipart request building
- response normalization
- command handler behavior
- error object behavior

Integration-style packaging validation is provided by:

```bash
npm run pack:check
```

That script:

- creates an npm tarball
- checks tarball contents
- installs the tarball into a temporary local project
- verifies SDK importability
- installs the tarball into a temporary global prefix
- verifies the `bsaa` binary

## Publishing Notes

### Maintainer release flow

```bash
npm login
npm whoami
npm version patch
npm run prepublishOnly
npm publish --access public
```

Use `minor` or `major` instead of `patch` as needed.

### Dry run

```bash
npm run publish:dry
```

### Manual tarball inspection

```bash
npm pack
tar -tf browserstack-app-automate-cli-1.0.0.tgz
```

### Manual local install test

```bash
npm pack
mkdir -p /tmp/bsaa-local-test
cd /tmp/bsaa-local-test
npm install /path/to/browserstack-app-automate-cli-1.0.0.tgz
node --input-type=module -e "import { EndpointRegistry } from 'browserstack-app-automate-cli'; console.log(Boolean(EndpointRegistry))"
```

### Manual global install test

```bash
npm pack
mkdir -p /tmp/bsaa-global-prefix
npm install -g --prefix /tmp/bsaa-global-prefix /path/to/browserstack-app-automate-cli-1.0.0.tgz
/tmp/bsaa-global-prefix/bin/bsaa --help
```

## Troubleshooting

### No saved session found

```bash
bsaa auth login
```

### Keychain support unavailable

Use encrypted-file storage with a master key:

```bash
bsaa auth login --storage encrypted-file --master-key '<key>'
```

### Encrypted session cannot be decrypted

Set the same `BSAA_MASTER_KEY` used when the session was created, or log in again and choose another storage backend.

### Unsupported operation

The CLI command surface is driven by the endpoint registry. Extend `src/api/registry/definitions.ts` when BrowserStack adds a new documented operation.

## Maintainer Notes

This package is intentionally ESM-first. If dual ESM/CJS support is ever required, add it deliberately instead of mixing incompatible entrypoint conventions.

Current known modeling choices:

- Appium uses legacy v1 endpoints.
- Detox Android is intentionally modeled as currently documented, without inventing a separate builds resource.
- Some newer framework session lists are derived from build detail responses because BrowserStack documents session detail endpoints more clearly than standalone list endpoints.
