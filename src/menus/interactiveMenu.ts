import { confirm, input, select } from '@inquirer/prompts';

import { normalizeArtifactCollection, normalizeSessionCollection } from '../api/normalizers/common.js';
import type { CommandRuntime } from '../cli/context.js';
import { promptForLogin } from '../prompts/authPrompts.js';
import { frameworkDescriptors, getFrameworkDescriptor, validateUploadPath } from '../services/frameworkConfigs.js';
import type {
  AuthStatus,
  FrameworkKey,
  LastResponseRecord,
  ResourceKey,
  SessionStatus,
} from '../types/domain.js';
import { prettyJson } from '../utils/json.js';

import {
  describeResource,
  frameworkHints,
  type TopLevelScreenKey,
} from './screenModel.js';

type FocusFramework = Exclude<FrameworkKey, 'auth'>;

interface DashboardSnapshotView {
  sessionStatus: SessionStatus;
  authStatus?: AuthStatus;
  lastResponse?: LastResponseRecord | null;
}

interface AppUiState {
  activeFramework: FocusFramework;
  needsValidationRefresh: boolean;
}

export async function runInteractiveMenu(runtime: CommandRuntime): Promise<void> {
  const initialStatus = await runtime.getSessionStatus();
  const uiState: AppUiState = {
    activeFramework: (initialStatus.currentFramework as FocusFramework | undefined) ?? 'appium',
    needsValidationRefresh: initialStatus.loggedIn,
  };

  while (true) {
    const snapshot = await runtime.getDashboardSnapshot({
      refreshValidation: uiState.needsValidationRefresh,
    });
    uiState.needsValidationRefresh = false;

    if (!snapshot.sessionStatus.loggedIn) {
      const next = await runWelcomeScreen(runtime);
      if (next === 'exit') {
        return;
      }

      if (next === 'connected') {
        uiState.needsValidationRefresh = true;
      }
      continue;
    }

    const action = await runDashboardScreen(runtime, snapshot, uiState);
    if (action === 'exit') {
      return;
    }

    try {
      switch (action) {
        case 'dashboard':
          uiState.needsValidationRefresh = true;
          break;
        case 'upload':
          await runUploadScreen(runtime, uiState);
          break;
        case 'artifacts':
          await runArtifactsScreen(runtime, uiState);
          break;
        case 'builds':
          await runBuildsScreen(runtime, uiState);
          break;
        case 'sessions':
          await runSessionsScreen(runtime, uiState);
          break;
        case 'media':
          await runMediaScreen(runtime);
          break;
        case 'frameworks':
          await runFrameworksScreen(runtime, uiState);
          break;
        case 'tools':
          await runToolsScreen(runtime, uiState);
          break;
        case 'settings':
          await runSettingsScreen(runtime, uiState);
          uiState.needsValidationRefresh = true;
          break;
        case 'help':
          await runHelpScreen(runtime);
          break;
      }
    } catch (error) {
      runtime.output.clear();
      runtime.output.title('Action interrupted', 'The current workflow could not be completed.');
      runtime.output.banner(
        'Something failed',
        error instanceof Error ? error.message : String(error),
        'error',
      );
      runtime.output.lines([
        'What you can do next:',
        '1. Retry the action',
        '2. Refresh account status',
        '3. Open Tools for raw endpoint details',
      ]);
      await pause('Press Enter to return to the dashboard');
    }
  }
}

async function runWelcomeScreen(runtime: CommandRuntime): Promise<'exit' | 'connected' | 'continue'> {
  runtime.output.clear();
  runtime.output.title(
    'BrowserStack App Automate CLI',
    'Manage uploads, builds, sessions, and media from your terminal.',
  );
  runtime.output.lines([
    'This tool helps you upload apps and test artifacts, browse recent automation runs, inspect execution sessions, and manage reusable media assets.',
    'Use interactive mode for guided workflows, or switch to command mode later for CI and scripting.',
    '',
    'Main workflows:',
    '- Upload app binaries and test suites/packages',
    '- Review builds and session details',
    '- Manage shared media files for test runs',
  ]);
  runtime.output.divider();
  runtime.output.footerHints([
    '[↑↓] Navigate',
    '[Enter] Select',
    '[Esc] Cancel',
    '[Q] Quit',
  ]);

  const choice = await select<'connect' | 'env' | 'help' | 'quit'>({
    message: 'Welcome',
    choices: [
      {
        name: 'Connect BrowserStack account',
        value: 'connect',
        description: 'Primary step. Validate credentials and start from a signed-in dashboard.',
      },
      {
        name: 'Use environment variables',
        value: 'env',
        description: 'Connect via BSAA_USERNAME and BSAA_ACCESS_KEY without saving credentials.',
      },
      {
        name: 'Help',
        value: 'help',
        description: 'Learn what this tool does and how authentication works.',
      },
      {
        name: 'Quit',
        value: 'quit',
        description: 'Exit the interactive terminal workspace.',
      },
    ],
  });

  if (choice === 'quit') {
    return 'exit';
  }

  if (choice === 'help') {
    await runHelpScreen(runtime);
    return 'continue';
  }

  if (choice === 'env') {
    runtime.output.clear();
    runtime.output.title('Use environment variables', 'Connect without storing credentials locally.');
    runtime.output.lines([
      'Set these in your shell before launching the CLI:',
      'export BSAA_USERNAME="your-browserstack-username"',
      'export BSAA_ACCESS_KEY="your-browserstack-access-key"',
      '',
      'Then restart this interactive mode or choose Refresh account status from Settings later.',
    ]);
    await pause('Press Enter to return');
    return 'continue';
  }

  const prompted = await promptForLogin();
  await runtime.runWithSpinner('Checking BrowserStack connection…', async () => {
    await runtime.auth.login(prompted);
  });
  await runOnboarding(runtime);
  return 'connected';
}

async function runDashboardScreen(
  runtime: CommandRuntime,
  snapshot: DashboardSnapshotView,
  uiState: AppUiState,
): Promise<TopLevelScreenKey> {
  renderDashboard(runtime, snapshot, uiState);

  const status = snapshot.sessionStatus;
  const quickActionPrefix = status.connectionState === 'invalid' ? 'Recovery' : 'Quick action';

  return select<TopLevelScreenKey>({
    message: 'Choose your next task',
    choices: [
      {
        name: `${quickActionPrefix}: Upload`,
        value: 'upload',
        description: 'Send a new app, test suite/package, or media asset to BrowserStack.',
      },
      {
        name: `${quickActionPrefix}: Apps & Packages`,
        value: 'artifacts',
        description: 'Browse uploaded apps and test artifacts, then inspect or remove them.',
      },
      {
        name: `${quickActionPrefix}: Builds`,
        value: 'builds',
        description: 'Open recent runs and inspect overall build status.',
      },
      {
        name: `${quickActionPrefix}: Sessions`,
        value: 'sessions',
        description: 'Inspect test execution sessions, linked logs, and session metadata.',
      },
      {
        name: 'Media',
        value: 'media',
        description: 'Manage reusable media assets for supported test scenarios.',
      },
      {
        name: 'Frameworks',
        value: 'frameworks',
        description: 'Switch your active framework focus and see framework capabilities.',
      },
      {
        name: 'Tools',
        value: 'tools',
        description: 'Search resources, export the last response, or use the raw endpoint explorer.',
      },
      {
        name: 'Settings',
        value: 'settings',
        description: 'Manage account state, reconnect, logout, and other preferences.',
      },
      {
        name: 'Help',
        value: 'help',
        description: 'See common workflows, keyboard hints, auth behavior, and command-mode tips.',
      },
      {
        name: 'Exit',
        value: 'exit',
        description: 'Leave the interactive BrowserStack workspace.',
      },
    ],
  });
}

function renderDashboard(
  runtime: CommandRuntime,
  snapshot: DashboardSnapshotView,
  uiState: AppUiState,
): void {
  const { sessionStatus, authStatus, lastResponse } = snapshot;

  runtime.output.clear();
  runtime.output.title(
    'BrowserStack App Automate CLI',
    'Manage uploads, builds, sessions, and media from your terminal.',
  );

  if (sessionStatus.connectionState === 'invalid' && sessionStatus.lastValidationError) {
    runtime.output.banner(
      'Credential attention needed',
      `The saved or environment-provided credentials could not be validated.\nNext step: open Settings to reconnect, switch account, or inspect auth details.`,
      'warning',
    );
  }

  runtime.output.lines([
    `${runtime.output.badge(humanStateLabel(sessionStatus.connectionState), sessionStatus.connectionState ?? 'disconnected')} ${statusSentence(sessionStatus)}`,
    '',
  ]);

  runtime.output.section('Status');
  runtime.output.kv('Connected as:', sessionStatus.username ?? 'No account connected');
  runtime.output.kv('Auth source:', humanAuthSource(sessionStatus.authSource));
  runtime.output.kv('Current framework:', frameworkLabel(uiState.activeFramework));
  runtime.output.kv(
    'Last successful API check:',
    sessionStatus.lastValidatedAt ? formatTime(sessionStatus.lastValidatedAt) : 'Not checked yet',
  );
  runtime.output.kv(
    'Last action:',
    sessionStatus.lastActionLabel
      ? `${sessionStatus.lastActionLabel} · ${formatTime(sessionStatus.lastActionAt)}`
      : 'No interactive actions yet',
  );
  runtime.output.kv(
    'API health:',
    authStatus?.valid
      ? `Healthy · plan ${authStatus.planName ?? 'available'}`
      : sessionStatus.connectionState === 'invalid'
        ? 'Needs attention'
        : 'Ready',
  );

  runtime.output.divider();
  runtime.output.section('Quick actions');
  runtime.output.lines([
    '- Upload new app or test artifact',
    '- Browse recent apps and packages',
    '- Open recent builds',
    '- Open recent sessions',
    '- Upload media for test scenarios',
  ]);

  runtime.output.divider();
  runtime.output.section('Recent context');
  if (lastResponse) {
    runtime.output.lines([
      `Last response: ${lastResponse.command ?? `${lastResponse.framework ?? 'unknown'} ${lastResponse.operation ?? ''}`}`.trim(),
      `Captured: ${formatTime(lastResponse.at)}`,
      `Scope: ${[lastResponse.framework, lastResponse.resource, lastResponse.operation]
        .filter(Boolean)
        .join(' / ') || 'N/A'}`,
    ]);
  } else {
    runtime.output.emptyState(
      'No recent response yet',
      'Run an upload, list, build, or session action to capture reusable output for later export.',
      'Recommended next step: open Upload or Apps & Packages.',
    );
  }

  runtime.output.divider();
  runtime.output.footerHints([
    '[↑↓] Navigate',
    '[Enter] Open',
    'Dashboard first',
    'Settings for account recovery',
    'Tools for advanced actions',
  ]);
}

async function runUploadScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const choice = await renderActionScreen<'app' | 'suite' | 'package' | 'media' | 'back'>(
    runtime,
    'Upload',
    'Send a new app, test suite/package, or media asset to BrowserStack.',
    [
      'Typical actions: upload app, upload test suite/package, upload media.',
      'Auth required: yes.',
      'Supports local file uploads and public URLs where the framework allows them.',
    ],
    [
      {
        name: 'Upload app',
        value: 'app',
        description: 'Send a local APK/AAB/XAPK/IPA or a public URL to BrowserStack.',
      },
      {
        name: 'Upload test suite',
        value: 'suite',
        description: 'Send framework-specific test artifacts such as ZIP or APK test bundles.',
      },
      {
        name: 'Upload Flutter iOS package',
        value: 'package',
        description: 'Send a Flutter iOS package archive for build execution later.',
      },
      {
        name: 'Upload media',
        value: 'media',
        description: 'Upload a shared media file and receive a reusable media_url.',
      },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  if (choice === 'media') {
    await runMediaScreen(runtime);
    return;
  }

  const resource: ResourceKey =
    choice === 'app' ? 'apps' : choice === 'suite' ? 'test-suites' : 'test-packages';
  const framework = await chooseFrameworkForResource(runtime, resource, uiState.activeFramework);
  uiState.activeFramework = framework;
  await runtime.setCurrentFramework(framework);

  runtime.output.clear();
  const descriptor = getFrameworkDescriptor(framework);
  runtime.output.title('Upload', `${descriptor?.label ?? framework} · ${describeResource(resource)}`);
  runtime.output.lines([
    `Supports: ${uploadSupports(framework, resource)}`,
    'Typical output: URL/ID, custom_id, uploaded_at, expiry, and shareable references where supported.',
    'Tip: use custom_id when you want a stable human-readable label for reuse later.',
  ]);

  const source = await select<'file' | 'url'>({
    message: 'Upload source',
    choices: [
      { name: 'Local file', value: 'file', description: 'Upload a file from your machine or CI workspace.' },
      { name: 'Public URL', value: 'url', description: 'Let BrowserStack fetch a public artifact URL.' },
    ],
  });

  const pathOrUrl = await input({
    message: source === 'file' ? 'File path' : 'Public URL',
  });
  const customId = await input({
    message: 'Custom ID (optional)',
    default: '',
  });

  if (source === 'file') {
    const warnings = validateUploadPath(framework, resource, pathOrUrl);
    if (warnings.length > 0) {
      runtime.output.warning(warnings.join('\n'));
    }
  }

  const service = await runtime.getResourceService();
  const response = await runtime.runWithSpinner('Uploading asset…', async () =>
    service.execute({
      framework,
      resource,
      operation: 'upload',
      filePath: source === 'file' ? pathOrUrl : undefined,
      url: source === 'url' ? pathOrUrl : undefined,
      fields: { custom_id: customId || undefined },
    }),
  );

  await runtime.saveLastResponse({
    command: `interactive upload ${resource}`,
    framework,
    resource,
    operation: 'upload',
    payload: response,
  });

  runtime.output.clear();
  runtime.output.title('Upload complete', 'BrowserStack accepted the artifact.');
  runtime.output.emit(response);
  await pause('Press Enter to return to the dashboard');
}

async function runArtifactsScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const choice = await renderActionScreen<'apps' | 'suites' | 'packages' | 'delete' | 'search' | 'back'>(
    runtime,
    'Apps & Packages',
    'Browse, search, and remove uploaded apps or test artifacts.',
    [
      'Works with uploaded apps, test suites, and Flutter iOS test packages.',
      'Typical actions: recent uploads, filter by custom ID or scope, inspect IDs, delete outdated items.',
      'Auth required: yes.',
    ],
    [
      { name: 'Browse uploaded apps', value: 'apps', description: 'List recent app binaries for a chosen framework.' },
      { name: 'Browse test suites', value: 'suites', description: 'List recent test suites for a chosen framework.' },
      {
        name: 'Browse Flutter iOS packages',
        value: 'packages',
        description: 'List recent Flutter iOS test packages.',
      },
      {
        name: 'Delete uploaded item',
        value: 'delete',
        description: 'Remove a previously uploaded app, suite, package, or media item with confirmation.',
      },
      {
        name: 'Search/filter uploads',
        value: 'search',
        description: 'Search by custom_id, name, or URL fragment.',
      },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  if (choice === 'search') {
    await runSearchMenu(runtime, uiState.activeFramework);
    return;
  }

  if (choice === 'delete') {
    await runDeleteWorkflow(runtime, uiState);
    return;
  }

  const resource: ResourceKey =
    choice === 'apps' ? 'apps' : choice === 'suites' ? 'test-suites' : 'test-packages';
  const framework = await chooseFrameworkForResource(runtime, resource, uiState.activeFramework);
  uiState.activeFramework = framework;
  await runtime.setCurrentFramework(framework);

  const customId = await input({ message: 'Custom ID filter (optional)', default: '' });
  const scope =
    framework === 'appium' || framework === 'media'
      ? await select<'user' | 'group'>({
          message: 'Scope',
          choices: [
            { name: 'User', value: 'user', description: 'Only uploads from the current account.' },
            { name: 'Group', value: 'group', description: 'Uploads available to the BrowserStack group.' },
          ],
        })
      : await select<'user' | 'group'>({
          message: 'Scope',
          choices: [
            { name: 'User', value: 'user', description: 'Only uploads from the current account.' },
            { name: 'Group', value: 'group', description: 'Ask the API for group-scoped uploads where supported.' },
          ],
        });

  const service = await runtime.getResourceService();
  const operation =
    (framework === 'appium' || framework === 'media') && scope === 'group' ? 'list-group' : 'list';
  const response = await runtime.runWithSpinner('Loading uploaded artifacts…', async () =>
    service.execute({
      framework,
      resource,
      operation,
      query: {
        custom_id: customId || undefined,
        scope,
        limit: 20,
      },
    }),
  );

  const items = normalizeArtifactCollection(response);
  await runtime.saveLastResponse({
    command: `interactive list ${resource}`,
    framework,
    resource,
    operation,
    payload: response,
  });

  runtime.output.clear();
  runtime.output.title('Apps & Packages', `${frameworkLabel(framework)} · ${describeResource(resource)}`);
  if (items.length === 0) {
    runtime.output.emptyState(
      'No uploaded items found yet',
      'There are no matching uploads for the selected framework and filters.',
      'Recommended next step: open Upload to send your first artifact.',
    );
  } else {
    runtime.output.emit(items, () => runtime.output.tableFromArtifacts(items));
  }
  await pause('Press Enter to return');
}

async function runBuildsScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const choice = await renderActionScreen<'list' | 'details' | 'stop' | 'back'>(
    runtime,
    'Builds',
    'Review recent automation runs and inspect their status.',
    [
      'Use builds when you want a run-level summary before opening sessions.',
      'Typical actions: list recent builds, inspect build details, stop a running v2 build.',
      'Auth required: yes.',
    ],
    [
      { name: 'Recent builds', value: 'list', description: 'Open recent BrowserStack build summaries.' },
      { name: 'Build details', value: 'details', description: 'Inspect one build by ID.' },
      { name: 'Stop running build', value: 'stop', description: 'Stop a currently running v2 build.' },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  const framework = await chooseFrameworkForResource(runtime, 'builds', uiState.activeFramework);
  uiState.activeFramework = framework;
  await runtime.setCurrentFramework(framework);
  const service = await runtime.getResourceService();

  if (choice === 'list') {
    const response = await runtime.runWithSpinner('Loading recent builds…', async () =>
      service.listBuilds(framework, { limit: 20 }),
    );
    await runtime.saveLastResponse({
      command: 'interactive builds list',
      framework,
      resource: 'builds',
      operation: 'list',
      payload: response,
    });
    runtime.output.clear();
    runtime.output.title('Builds', `${frameworkLabel(framework)} · recent builds`);
    if (response.length === 0) {
      runtime.output.emptyState(
        'No builds found yet',
        'There are no recent builds for the selected framework.',
        'Recommended next step: upload artifacts or run a build first.',
      );
    } else {
      runtime.output.emit(response, () => runtime.output.tableFromBuilds(response));
    }
    await pause('Press Enter to return');
    return;
  }

  const buildId = await input({ message: 'Build ID' });

  if (choice === 'details') {
    const response = await runtime.runWithSpinner('Loading build details…', async () =>
      service.execute({
        framework,
        resource: 'builds',
        operation: 'get',
        pathParams: framework === 'appium' ? { buildID: buildId } : { buildId },
      }),
    );
    await runtime.saveLastResponse({
      command: 'interactive builds get',
      framework,
      resource: 'builds',
      operation: 'get',
      payload: response,
    });
    runtime.output.clear();
    runtime.output.title('Build details', `${frameworkLabel(framework)} · ${buildId}`);
    runtime.output.emit(response);
    await pause('Press Enter to return');
    return;
  }

  const response = await runtime.runWithSpinner('Stopping build…', async () =>
    service.execute({
      framework,
      resource: 'builds',
      operation: 'stop',
      pathParams: { buildId },
    }),
  );
  runtime.output.clear();
  runtime.output.title('Build stop request sent', `${frameworkLabel(framework)} · ${buildId}`);
  runtime.output.emit(response);
  await pause('Press Enter to return');
}

async function runSessionsScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const choice = await renderActionScreen<'list' | 'details' | 'back'>(
    runtime,
    'Sessions',
    'Open detailed execution sessions, logs, and linked artifacts.',
    [
      'Best for device-level execution details after you already know the build or session ID.',
      'Typical actions: list sessions for a build, inspect one session, update Appium session status in command mode.',
      'Auth required: yes.',
    ],
    [
      { name: 'Recent sessions for a build', value: 'list', description: 'List sessions under a chosen build.' },
      { name: 'Session details', value: 'details', description: 'Inspect one session by ID.' },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  const framework = await chooseFrameworkForResource(runtime, 'sessions', uiState.activeFramework);
  uiState.activeFramework = framework;
  await runtime.setCurrentFramework(framework);
  const service = await runtime.getResourceService();

  if (choice === 'list') {
    const buildId = await input({
      message:
        framework === 'appium'
          ? 'Build ID'
          : 'Build ID (sessions are derived from build details for this framework)',
    });
    const sessions =
      framework === 'appium'
        ? normalizeSessionCollection(
            await runtime.runWithSpinner('Loading recent sessions…', async () =>
              service.execute({
                framework,
                resource: 'sessions',
                operation: 'list',
                pathParams: { buildID: buildId },
                query: { limit: 20 },
              }),
            ),
          )
        : await runtime.runWithSpinner('Loading sessions from build details…', async () =>
            service.getBuildSessions(framework, buildId),
          );

    await runtime.saveLastResponse({
      command: 'interactive sessions list',
      framework,
      resource: 'sessions',
      operation: 'list',
      payload: sessions,
    });
    runtime.output.clear();
    runtime.output.title('Sessions', `${frameworkLabel(framework)} · build ${buildId}`);
    if (sessions.length === 0) {
      runtime.output.emptyState(
        'No sessions found',
        'This build does not currently expose any matching sessions.',
        'Recommended next step: confirm the build ID or inspect build details first.',
      );
    } else {
      runtime.output.emit(sessions, () => runtime.output.tableFromSessions(sessions));
    }
    await pause('Press Enter to return');
    return;
  }

  const sessionId = await input({ message: 'Session ID' });
  const buildId =
    framework === 'appium' || framework === 'detox-android'
      ? undefined
      : await input({ message: 'Build ID' });

  const response = await runtime.runWithSpinner('Loading session details…', async () =>
    service.execute({
      framework,
      resource: 'sessions',
      operation: 'get',
      pathParams:
        framework === 'appium' || framework === 'detox-android'
          ? { sessionID: sessionId }
          : { buildId, sessionId },
    }),
  );

  await runtime.saveLastResponse({
    command: 'interactive sessions get',
    framework,
    resource: 'sessions',
    operation: 'get',
    payload: response,
  });
  runtime.output.clear();
  runtime.output.title('Session details', `${frameworkLabel(framework)} · ${sessionId}`);
  runtime.output.emit(response);
  await pause('Press Enter to return');
}

async function runMediaScreen(runtime: CommandRuntime): Promise<void> {
  const choice = await renderActionScreen<'upload' | 'list' | 'delete' | 'back'>(
    runtime,
    'Media',
    'Manage reusable media files for test runs.',
    [
      'Use media uploads for scenarios that require files to be available inside the app during test execution.',
      'Typical output: media_url and related identifiers.',
      'Auth required: yes.',
    ],
    [
      { name: 'Upload media', value: 'upload', description: 'Upload a local file and receive a reusable media_url.' },
      { name: 'Browse media', value: 'list', description: 'List recent uploaded media files.' },
      { name: 'Delete media', value: 'delete', description: 'Remove a media asset you no longer need.' },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  const service = await runtime.getResourceService();

  if (choice === 'upload') {
    runtime.output.clear();
    runtime.output.title('Upload media', 'Upload a shared file for supported App Automate scenarios.');
    runtime.output.lines([
      'Supports: browserstack media workflows and framework payloads that accept media references.',
      'Tip: keep the returned media_url handy for later build execution payloads.',
    ]);
    const filePath = await input({ message: 'File path' });
    const customId = await input({ message: 'Custom ID (optional)', default: '' });
    const response = await runtime.runWithSpinner('Uploading media…', async () =>
      service.execute({
        framework: 'media',
        resource: 'media',
        operation: 'upload',
        filePath,
        fields: { custom_id: customId || undefined },
      }),
    );
    await runtime.saveLastResponse({
      command: 'interactive media upload',
      framework: 'media',
      resource: 'media',
      operation: 'upload',
      payload: response,
    });
    runtime.output.clear();
    runtime.output.title('Media upload complete', 'Use the returned media_url in supported test flows.');
    runtime.output.emit(response);
    await pause('Press Enter to return');
    return;
  }

  if (choice === 'list') {
    const scope = await select<'user' | 'group'>({
      message: 'Scope',
      choices: [
        { name: 'User', value: 'user', description: 'Only media uploaded by the current account.' },
        { name: 'Group', value: 'group', description: 'Media shared with the BrowserStack group.' },
      ],
    });
    const operation = scope === 'group' ? 'list-group' : 'list';
    const response = await runtime.runWithSpinner('Loading media…', async () =>
      service.execute({
        framework: 'media',
        resource: 'media',
        operation,
        query: { limit: 20 },
      }),
    );
    await runtime.saveLastResponse({
      command: 'interactive media list',
      framework: 'media',
      resource: 'media',
      operation,
      payload: response,
    });
    runtime.output.clear();
    runtime.output.title('Media', `${scope === 'group' ? 'Group' : 'User'} uploads`);
    runtime.output.emit(response);
    await pause('Press Enter to return');
    return;
  }

  const mediaId = await input({ message: 'Media ID' });
  const accepted = await confirm({
    message: `Delete media ${mediaId}?`,
    default: false,
  });
  if (!accepted) {
    runtime.output.warning('Delete cancelled.');
    await pause('Press Enter to return');
    return;
  }
  const response = await runtime.runWithSpinner('Deleting media…', async () =>
    service.execute({
      framework: 'media',
      resource: 'media',
      operation: 'delete',
      pathParams: { media_id: mediaId },
    }),
  );
  runtime.output.clear();
  runtime.output.title('Media removed', mediaId);
  runtime.output.emit(response);
  await pause('Press Enter to return');
}

async function runFrameworksScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  runtime.output.clear();
  runtime.output.title('Frameworks', 'Switch your current focus and see framework-specific guidance.');
  runtime.output.lines([
    `Current focus: ${frameworkLabel(uiState.activeFramework)}`,
    '',
    ...frameworkDescriptors.map((descriptor) => `- ${descriptor.label}: ${descriptor.shortDescription}`),
  ]);
  runtime.output.divider();

  const framework = await select<FocusFramework | 'back'>({
    message: 'Choose a framework focus',
    choices: [
      ...sortFrameworks(uiState.activeFramework).map((descriptor) => ({
        name: descriptor.label,
        value: descriptor.key as FocusFramework,
        description: descriptor.shortDescription,
      })),
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  });

  if (framework === 'back') {
    return;
  }

  uiState.activeFramework = framework;
  await runtime.setCurrentFramework(framework);
  runtime.output.success(`Active framework set to ${frameworkLabel(framework)}.`);
  await pause('Press Enter to return');
}

async function runToolsScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const choice = await renderActionScreen<
    'search' | 'explorer' | 'export' | 'refresh' | 'last-response' | 'back'
  >(
    runtime,
    'Tools',
    'Advanced workflows and power-user utilities.',
    [
      'Use this area for search, export, raw endpoint access, and health refresh.',
      'Auth required: usually yes.',
      'These actions are useful, but they are intentionally secondary to the task-first main navigation.',
    ],
    [
      {
        name: 'Search resources',
        value: 'search',
        description: 'Search recent uploads by framework, resource type, and text term.',
      },
      {
        name: 'Raw endpoint explorer',
        value: 'explorer',
        description: 'Choose a framework/resource/operation and execute it directly.',
      },
      {
        name: 'Export last response',
        value: 'export',
        description: 'Write the last captured response to a file for reuse or debugging.',
      },
      {
        name: 'Refresh account status',
        value: 'refresh',
        description: 'Re-check BrowserStack connection health and update dashboard state.',
      },
      {
        name: 'Show last response summary',
        value: 'last-response',
        description: 'Inspect the most recent captured response without leaving interactive mode.',
      },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  if (choice === 'search') {
    await runSearchMenu(runtime, uiState.activeFramework);
    return;
  }

  if (choice === 'explorer') {
    const { createExplorerCommand } = await import('../commands/explorer.js');
    await createExplorerCommand(runtime).parseAsync(['explorer'], { from: 'user' });
    await pause('Press Enter to return');
    return;
  }

  if (choice === 'export') {
    const filePath = await input({ message: 'Export path' });
    const force = await confirm({ message: 'Overwrite if the file already exists?', default: false });
    await runtime.exportLastResponse(filePath, force);
    runtime.output.success(`Exported last response to ${filePath}`);
    await pause('Press Enter to return');
    return;
  }

  if (choice === 'refresh') {
    await runtime.runWithSpinner('Checking BrowserStack connection…', async () => {
      const { session } = await runtime.auth.getActiveSession(runtime.options.masterKey);
      if (!session) {
        throw new Error('No connected account is available to validate.');
      }
      await runtime.auth.validate(session);
    });
    runtime.output.success('Account status refreshed.');
    await pause('Press Enter to return');
    return;
  }

  const last = await runtime.getLastResponse();
  runtime.output.clear();
  runtime.output.title('Last response', 'Most recent captured API result.');
  if (!last) {
    runtime.output.emptyState(
      'No saved response yet',
      'Run an action such as upload, list, build, or session inspection first.',
    );
  } else {
    runtime.output.lines([
      `Command: ${last.command ?? 'N/A'}`,
      `Captured: ${formatTime(last.at)}`,
      `Scope: ${[last.framework, last.resource, last.operation].filter(Boolean).join(' / ') || 'N/A'}`,
      '',
      prettyJson(last.payload),
    ]);
  }
  await pause('Press Enter to return');
}

async function runSettingsScreen(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const snapshot = await runtime.getDashboardSnapshot();
  const status = snapshot.sessionStatus;

  const choice = await renderActionScreen<
    'status' | 'reconnect' | 'switch' | 'logout' | 'framework' | 'back'
  >(
    runtime,
    'Settings',
    'Manage credentials, account state, active framework, and recovery actions.',
    [
      `Connected account: ${status.username ?? 'None'}`,
      `Auth source: ${humanAuthSource(status.authSource)}`,
      `Current framework focus: ${frameworkLabel(uiState.activeFramework)}`,
      'Auth is intentionally kept here instead of dominating the main dashboard once you are signed in.',
    ],
    [
      { name: 'Account status', value: 'status', description: 'See auth source, validation state, and saved account context.' },
      { name: 'Reconnect account', value: 'reconnect', description: 'Validate the current credentials again and refresh API health.' },
      { name: 'Switch account', value: 'switch', description: 'Log in with a different BrowserStack account.' },
      { name: 'Logout', value: 'logout', description: 'Clear saved session credentials from local storage.' },
      { name: 'Choose active framework', value: 'framework', description: 'Set the framework focus used by task-first workflows.' },
      { name: 'Back', value: 'back', description: 'Return to the dashboard.' },
    ],
  );

  if (choice === 'back') {
    return;
  }

  if (choice === 'status') {
    runtime.output.clear();
    runtime.output.title('Account status', 'Current authentication and persistence details.');
    runtime.output.lines([
      `Connected as: ${status.username ?? 'Not connected'}`,
      `Connection state: ${humanStateLabel(status.connectionState)}`,
      `Auth source: ${humanAuthSource(status.authSource)}`,
      `Saved at: ${status.savedAt ? formatTime(status.savedAt) : 'Not saved'}`,
      `Last successful API check: ${status.lastValidatedAt ? formatTime(status.lastValidatedAt) : 'Not checked yet'}`,
      `Last validation error: ${status.lastValidationError ?? 'None'}`,
    ]);
    await pause('Press Enter to return');
    return;
  }

  if (choice === 'reconnect') {
    const { session } = await runtime.auth.getActiveSession(runtime.options.masterKey);
    if (!session) {
      runtime.output.warning('No credentials are available to reconnect.');
      await pause('Press Enter to return');
      return;
    }
    await runtime.runWithSpinner('Checking BrowserStack connection…', async () => {
      await runtime.auth.validate(session);
    });
    runtime.output.success('Connection refreshed.');
    await pause('Press Enter to return');
    return;
  }

  if (choice === 'switch') {
    const prompted = await promptForLogin();
    await runtime.runWithSpinner('Switching account…', async () => {
      await runtime.auth.login(prompted);
    });
    await runOnboarding(runtime);
    return;
  }

  if (choice === 'logout') {
    if (status.authSource === 'environment') {
      runtime.output.warning(
        'This session is currently coming from environment variables. Logging out only clears saved local credentials; environment variables will still reconnect on the next launch.',
      );
    }
    const accepted = await confirm({
      message: 'Clear saved credentials?',
      default: false,
    });
    if (!accepted) {
      return;
    }
    await runtime.auth.logout();
    runtime.output.success('Saved session removed.');
    await pause('Press Enter to continue');
    return;
  }

  await runFrameworksScreen(runtime, uiState);
}

async function runHelpScreen(runtime: CommandRuntime): Promise<void> {
  runtime.output.clear();
  runtime.output.title(
    'Help',
    'What this tool does, how interactive mode works, and how to move faster.',
  );
  runtime.output.lines([
    'What this tool is:',
    '- A BrowserStack App Automate workspace for uploads, builds, sessions, media, and account-aware terminal workflows.',
    '',
    'Supported frameworks:',
    ...frameworkDescriptors.map((descriptor) => `- ${descriptor.label}: ${descriptor.shortDescription}`),
    '',
    'Common workflows:',
    '1. Connect your BrowserStack account',
    '2. Upload an app or test artifact',
    '3. Open builds to see run status',
    '4. Open sessions to inspect execution details',
    '5. Use Media for reusable files in supported test flows',
    '',
    'Interactive mode tips:',
    '- Dashboard is the home screen once connected.',
    '- Settings handles account management and reconnect flows.',
    '- Tools contains advanced actions like raw endpoint exploration and export.',
    '',
    'Keyboard model:',
    '- Arrow keys move through prompts',
    '- Enter opens the selected action',
    '- Escape cancels the current prompt when supported by your terminal',
    '',
    'Credential storage:',
    '- Environment variables if provided',
    '- Otherwise OS keychain, encrypted file, or explicit plain-file fallback',
    '- Stored credentials live outside the repository root',
    '',
    'Switching to command mode:',
    '- Use `bstack --help` for non-interactive commands',
    '- Useful for CI, shell history, and repeatable automation',
    '',
    'Debugging:',
    '- Start the CLI with `--debug-http` to see request flow',
    '- Use Tools -> Raw endpoint explorer for low-level investigation',
  ]);
  await pause('Press Enter to return');
}

async function runSearchMenu(runtime: CommandRuntime, preferredFramework: FocusFramework): Promise<void> {
  const framework = await chooseFrameworkForResource(runtime, 'apps', preferredFramework, {
    includeMedia: true,
    title: 'Search resources',
  });
  const resource = await select<ResourceKey>({
    message: 'Resource type',
    choices: [
      { name: 'Apps', value: 'apps', description: 'Uploaded application binaries.' },
      { name: 'Test suites', value: 'test-suites', description: 'Uploaded test suite artifacts.' },
      { name: 'Test packages', value: 'test-packages', description: 'Flutter iOS package artifacts.' },
      { name: 'Media', value: 'media', description: 'Uploaded media assets.' },
    ],
  });
  const term = await input({ message: 'Search term (custom_id, name, or URL fragment)' });

  const service = await runtime.getResourceService();
  const response = await runtime.runWithSpinner('Searching recent resources…', async () =>
    service.execute({
      framework,
      resource,
      operation: 'list',
    }),
  );

  const text = JSON.stringify(response).toLowerCase();
  runtime.output.clear();
  runtime.output.title('Search results', `${frameworkLabel(framework)} · ${resource}`);
  runtime.output.emit({
    term,
    matched: text.includes(term.toLowerCase()),
    payload: response,
  });
  await pause('Press Enter to return');
}

async function runDeleteWorkflow(runtime: CommandRuntime, uiState: AppUiState): Promise<void> {
  const resource = await select<ResourceKey>({
    message: 'What do you want to delete?',
    choices: [
      { name: 'App', value: 'apps', description: 'Delete an uploaded app binary.' },
      { name: 'Test suite', value: 'test-suites', description: 'Delete an uploaded test suite.' },
      { name: 'Flutter iOS package', value: 'test-packages', description: 'Delete a Flutter iOS package.' },
      { name: 'Media file', value: 'media', description: 'Delete an uploaded media asset.' },
    ],
  });

  const framework =
    resource === 'media'
      ? 'media'
      : await chooseFrameworkForResource(runtime, resource, uiState.activeFramework);

  if (framework !== 'media') {
    uiState.activeFramework = framework;
    await runtime.setCurrentFramework(framework);
  }

  const itemId = await input({ message: 'ID to delete' });
  const accepted = await confirm({
    message: `Delete ${resource} ${itemId}?`,
    default: false,
  });
  if (!accepted) {
    runtime.output.warning('Delete cancelled.');
    await pause('Press Enter to return');
    return;
  }

  const service = await runtime.getResourceService();
  const response = await runtime.runWithSpinner('Deleting item…', async () =>
    service.execute({
      framework,
      resource,
      operation: 'delete',
      pathParams:
        resource === 'apps'
          ? { appId: itemId, appID: itemId }
          : resource === 'test-suites'
            ? { testSuiteId: itemId }
            : resource === 'test-packages'
              ? { testPackageId: itemId }
              : { media_id: itemId },
    }),
  );
  runtime.output.clear();
  runtime.output.title('Delete complete', `${resource} · ${itemId}`);
  runtime.output.emit(response);
  await pause('Press Enter to return');
}

async function runOnboarding(runtime: CommandRuntime): Promise<void> {
  runtime.output.clear();
  runtime.output.title('Welcome aboard', 'Your BrowserStack account is connected.');
  runtime.output.lines([
    'Before you start, choose the framework you work with most often. The dashboard and task-first flows will use it as the default focus.',
  ]);

  const framework = await select<FocusFramework>({
    message: 'Preferred framework',
    choices: frameworkDescriptors.map((descriptor) => ({
      name: descriptor.label,
      value: descriptor.key as FocusFramework,
      description: descriptor.shortDescription,
    })),
  });

  await runtime.setCurrentFramework(framework);

  runtime.output.clear();
  runtime.output.title('You are ready to go', `${frameworkLabel(framework)} is now your default focus.`);
  runtime.output.lines([
    'Three core actions to start with:',
    '1. Upload an app or test artifact',
    '2. Browse recent builds to confirm run status',
    '3. Open sessions for debugging and execution details',
  ]);
  await pause('Press Enter to open the dashboard');
}

async function renderActionScreen<T extends string>(
  runtime: CommandRuntime,
  title: string,
  subtitle: string,
  context: string[],
  choices: Array<{ name: string; value: T; description: string }>,
): Promise<T> {
  runtime.output.clear();
  runtime.output.title(title, subtitle);
  runtime.output.section('Context');
  runtime.output.lines(context);
  runtime.output.divider();
  runtime.output.footerHints([
    '[↑↓] Navigate',
    '[Enter] Select',
    'Descriptions explain each action',
    'Back returns to the dashboard',
  ]);

  return select<T>({
    message: title,
    choices,
  });
}

async function chooseFrameworkForResource(
  runtime: CommandRuntime,
  resource: ResourceKey,
  preferred: FocusFramework,
  options?: { includeMedia?: boolean; title?: string },
): Promise<FocusFramework> {
  const service = await runtime.getResourceService();
  const registry = service.getRegistry();
  const supported = frameworkDescriptors.filter((descriptor) => {
    if (!options?.includeMedia && descriptor.key === 'media') {
      return false;
    }

    return registry
      .listByFramework(descriptor.key)
      .some((definition) => definition.resource === resource);
  });

  const preferredOrdered = supported.sort((left, right) =>
    left.key === preferred ? -1 : right.key === preferred ? 1 : 0,
  );

  return select<FocusFramework>({
    message: options?.title ?? 'Framework',
    choices: preferredOrdered.map((descriptor) => ({
      name: descriptor.label,
      value: descriptor.key as FocusFramework,
      description: descriptor.shortDescription,
    })),
  });
}

async function pause(message: string): Promise<void> {
  await input({ message, default: '' });
}

function humanAuthSource(source: SessionStatus['authSource']): string {
  switch (source) {
    case 'environment':
      return 'Environment variables';
    case 'keychain':
      return 'OS keychain';
    case 'encrypted-file':
      return 'Encrypted config';
    case 'plain-file':
      return 'Plain config file';
    default:
      return 'Not connected';
  }
}

function humanStateLabel(state: SessionStatus['connectionState']): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'saved-unvalidated':
      return 'Saved';
    case 'invalid':
      return 'Needs attention';
    default:
      return 'Disconnected';
  }
}

function statusSentence(status: SessionStatus): string {
  switch (status.connectionState) {
    case 'connected':
      return 'Your BrowserStack account is ready for uploads, builds, sessions, and media tasks.';
    case 'saved-unvalidated':
      return 'Credentials are available. Refresh the connection check if you want a live API validation.';
    case 'invalid':
      return 'The current credentials were rejected or could not be validated. Recovery actions are available in Settings.';
    default:
      return 'Connect your BrowserStack account to start using uploads, builds, sessions, and media workflows.';
  }
}

function frameworkLabel(framework: FocusFramework): string {
  return getFrameworkDescriptor(framework)?.label ?? framework;
}

function formatTime(value?: string): string {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sortFrameworks(preferred: FocusFramework) {
  return [...frameworkDescriptors].sort((left, right) =>
    left.key === preferred ? -1 : right.key === preferred ? 1 : 0,
  );
}

function uploadSupports(framework: FocusFramework, resource: ResourceKey): string {
  if (resource === 'media') {
    return 'Media upload';
  }

  const descriptor = getFrameworkDescriptor(framework);
  const rule = descriptor?.uploadRules.find((entry) => entry.resource === resource);
  return rule?.description ?? frameworkHints[framework];
}
