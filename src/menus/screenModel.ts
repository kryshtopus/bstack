import type { FrameworkKey, ResourceKey } from '../types/domain.js';

export type TopLevelScreenKey =
  | 'dashboard'
  | 'upload'
  | 'artifacts'
  | 'builds'
  | 'sessions'
  | 'media'
  | 'frameworks'
  | 'tools'
  | 'settings'
  | 'help'
  | 'exit';

export interface ScreenDescriptor {
  key: TopLevelScreenKey;
  title: string;
  description: string;
  helpTitle: string;
  helpBody: string[];
}

export const topLevelScreens: ScreenDescriptor[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description: 'See account status, recent activity, and the fastest next actions.',
    helpTitle: 'Dashboard',
    helpBody: [
      'Gives you a product-style overview instead of a raw API menu.',
      'Shows current connection health, active framework, last action, and recent response context.',
      'Use this as the default home screen when you are signed in.',
    ],
  },
  {
    key: 'upload',
    title: 'Upload',
    description: 'Send a new app, test suite, package, or media asset to BrowserStack.',
    helpTitle: 'Upload',
    helpBody: [
      'Best place to start when you want to send a new binary or media file.',
      'Typical actions: upload app, upload test suite/package, upload media.',
      'Supports local files and public URLs where the BrowserStack API allows them.',
    ],
  },
  {
    key: 'artifacts',
    title: 'Apps & Packages',
    description: 'Browse, search, and remove uploaded apps or test artifacts.',
    helpTitle: 'Apps & Packages',
    helpBody: [
      'Works with uploaded apps, test suites, and test packages.',
      'Typical actions: list recent uploads, filter by framework, inspect IDs, delete outdated assets.',
      'Useful when you want to reuse an existing app_url or clean up old artifacts.',
    ],
  },
  {
    key: 'builds',
    title: 'Builds',
    description: 'Review recent automation runs and inspect their status.',
    helpTitle: 'Builds',
    helpBody: [
      'Shows recent BrowserStack automation runs across supported frameworks.',
      'Typical actions: list builds, inspect details, stop running v2 builds.',
      'Use this when you need run-level status before opening individual sessions.',
    ],
  },
  {
    key: 'sessions',
    title: 'Sessions',
    description: 'Open detailed execution sessions, logs, and linked artifacts.',
    helpTitle: 'Sessions',
    helpBody: [
      'Best place to inspect a single test execution in detail.',
      'Typical actions: list sessions under a build, inspect session IDs, update Appium session status.',
      'Use build filters first for newer framework families.',
    ],
  },
  {
    key: 'media',
    title: 'Media',
    description: 'Manage reusable media files for test runs.',
    helpTitle: 'Media',
    helpBody: [
      'Upload, browse, and delete shared media assets.',
      'Typical output includes media URLs that you plug into BrowserStack capabilities or run payloads.',
      'Useful for camera, gallery, and file-selection test scenarios.',
    ],
  },
  {
    key: 'frameworks',
    title: 'Frameworks',
    description: 'Explore framework-specific capabilities and switch your current focus.',
    helpTitle: 'Frameworks',
    helpBody: [
      'Lets you set the current framework focus used by task-first screens.',
      'Shows plain-English explanations for Appium, Maestro, Espresso, Flutter, XCUITest, Detox, and Media.',
      'Useful when you mainly work in one framework day to day.',
    ],
  },
  {
    key: 'tools',
    title: 'Tools',
    description: 'Open advanced workflows such as search, export, and raw endpoint exploration.',
    helpTitle: 'Tools',
    helpBody: [
      'Advanced area for power users and troubleshooting.',
      'Includes raw endpoint explorer, last-response export, and connection refresh actions.',
      'Keeps low-level operations out of the default navigation path.',
    ],
  },
  {
    key: 'settings',
    title: 'Settings',
    description: 'Manage credentials, account state, active framework, and display preferences.',
    helpTitle: 'Settings',
    helpBody: [
      'Where account management belongs after onboarding.',
      'Typical actions: reconnect account, switch account, logout, inspect auth source, review active framework.',
      'Auth does not dominate the home screen once you are connected.',
    ],
  },
  {
    key: 'help',
    title: 'Help',
    description: 'Learn the app structure, common workflows, and terminal navigation model.',
    helpTitle: 'Help',
    helpBody: [
      'Explains what the product does, supported frameworks, auth behavior, and common workflows.',
      'Also shows interaction hints for interactive mode and command mode.',
      'Use this for onboarding and refresher guidance.',
    ],
  },
  {
    key: 'exit',
    title: 'Exit',
    description: 'Close the interactive BrowserStack App Automate workspace.',
    helpTitle: 'Exit',
    helpBody: ['Leaves the interactive UI and returns you to your shell.'],
  },
];

export function describeResource(resource: ResourceKey): string {
  switch (resource) {
    case 'apps':
      return 'Uploaded application binaries used as the app under test.';
    case 'test-suites':
      return 'Uploaded framework-specific test suites or supporting archives.';
    case 'test-packages':
      return 'Uploaded package artifacts used by Flutter iOS workflows.';
    case 'app-client':
      return 'Uploaded Detox Android app-client bundles.';
    case 'builds':
      return 'Automation runs and build-level status summaries.';
    case 'sessions':
      return 'Execution sessions, logs, and device-level run details.';
    case 'media':
      return 'Reusable uploaded media files for supported test scenarios.';
    case 'plan':
      return 'Account plan usage and queue information.';
    default:
      return 'Authentication and account validation operations.';
  }
}

export const frameworkHints: Record<Exclude<FrameworkKey, 'auth'>, string> = {
  appium: 'Supports app uploads, recent apps, builds, and Appium session inspection.',
  maestro: 'Works with apps, Maestro flows, build runs, and build-linked sessions.',
  espresso: 'Focused on Android app binaries and Espresso test suite uploads.',
  'flutter-android': 'Best for Flutter Android apps plus Android test APK workflows.',
  'flutter-ios': 'Best for Flutter iOS package uploads, builds, and sessions.',
  'detox-android': 'Focused on app upload, app-client upload, and session inspection.',
  xcuitest: 'Focused on IPA uploads, XCUITest bundles, builds, and sessions.',
  media: 'Shared media assets used by supported App Automate flows.',
};
