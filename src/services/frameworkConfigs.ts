import path from 'node:path';

import type { FrameworkKey, ResourceKey } from '../types/domain.js';

export interface UploadValidationRule {
  resource: ResourceKey;
  extensions: string[];
  description: string;
}

export interface FrameworkDescriptor {
  key: FrameworkKey;
  label: string;
  docsSummary: string;
  shortDescription: string;
  uploadRules: UploadValidationRule[];
}

export const frameworkDescriptors: FrameworkDescriptor[] = [
  {
    key: 'appium',
    label: 'Appium',
    docsSummary: 'Legacy Appium v1 endpoints for apps, builds, sessions, and plan usage.',
    shortDescription:
      'Cross-platform mobile automation with uploaded apps, builds, and Appium sessions.',
    uploadRules: [
      {
        resource: 'apps',
        extensions: ['.apk', '.aab', '.xapk', '.ipa'],
        description: 'Android .apk/.aab/.xapk or iOS .ipa',
      },
    ],
  },
  {
    key: 'maestro',
    label: 'Maestro',
    docsSummary: 'v2 APIs for apps, test suites, builds, and sessions.',
    shortDescription: 'Mobile UI flow execution with app uploads and Maestro flow artifacts.',
    uploadRules: [
      { resource: 'apps', extensions: ['.apk', '.aab', '.ipa'], description: 'App bundle or IPA' },
      { resource: 'test-suites', extensions: ['.zip'], description: 'Maestro test suite archive' },
    ],
  },
  {
    key: 'espresso',
    label: 'Espresso',
    docsSummary: 'v2 APIs for Android apps, test suites, builds, and sessions.',
    shortDescription:
      'Android-native test execution with app binaries and Espresso test suite uploads.',
    uploadRules: [
      { resource: 'apps', extensions: ['.apk', '.aab'], description: 'Android .apk or .aab' },
      { resource: 'test-suites', extensions: ['.apk'], description: 'Espresso androidTest APK' },
    ],
  },
  {
    key: 'flutter-android',
    label: 'Flutter Android',
    docsSummary: 'Flutter integration test APIs for Android apps, test suites, builds, and sessions.',
    shortDescription: 'Flutter Android app and test workflow support on real devices.',
    uploadRules: [
      { resource: 'apps', extensions: ['.apk', '.aab'], description: 'Android .apk or .aab' },
      { resource: 'test-suites', extensions: ['.apk'], description: 'Flutter Android test APK' },
    ],
  },
  {
    key: 'flutter-ios',
    label: 'Flutter iOS',
    docsSummary: 'Flutter iOS test package APIs, builds, and sessions.',
    shortDescription: 'iOS-side Flutter package, build, and session flows.',
    uploadRules: [
      {
        resource: 'test-packages',
        extensions: ['.zip'],
        description: 'Flutter iOS test package archive',
      },
    ],
  },
  {
    key: 'detox-android',
    label: 'Detox Android',
    docsSummary: 'Current docs expose app upload, app-client upload, and session inspection.',
    shortDescription: 'Android Detox workflows with app upload, app-client upload, and sessions.',
    uploadRules: [
      { resource: 'apps', extensions: ['.apk', '.aab'], description: 'Detox Android app bundle' },
      {
        resource: 'app-client',
        extensions: ['.apk', '.aab'],
        description: 'Detox Android app client bundle',
      },
    ],
  },
  {
    key: 'xcuitest',
    label: 'XCUITest',
    docsSummary: 'v2 APIs for iOS apps, test suites, builds, and sessions.',
    shortDescription:
      'iOS-native automation with IPA uploads and XCUITest build and session views.',
    uploadRules: [
      { resource: 'apps', extensions: ['.ipa'], description: 'iOS .ipa' },
      { resource: 'test-suites', extensions: ['.zip'], description: 'XCUITest test suite archive' },
    ],
  },
  {
    key: 'media',
    label: 'Media',
    docsSummary: 'Upload and manage media files used by App Automate test runs.',
    shortDescription: 'Shared media asset uploads for supported App Automate test scenarios.',
    uploadRules: [{ resource: 'media', extensions: [], description: 'Any file format supported by your app flow' }],
  },
];

export function getFrameworkDescriptor(framework: FrameworkKey): FrameworkDescriptor | undefined {
  return frameworkDescriptors.find((descriptor) => descriptor.key === framework);
}

export function validateUploadPath(
  framework: FrameworkKey,
  resource: ResourceKey,
  inputPath: string,
): string[] {
  const descriptor = getFrameworkDescriptor(framework);
  const extension = path.extname(inputPath).toLowerCase();
  const rule = descriptor?.uploadRules.find((candidate) => candidate.resource === resource);

  if (!rule || rule.extensions.length === 0) {
    return [];
  }

  if (rule.extensions.includes(extension)) {
    return [];
  }

  return [
    `Unexpected file extension "${extension || 'none'}" for ${descriptor?.label ?? framework} ${resource}. Expected: ${rule.extensions.join(', ')}`,
  ];
}
