import { confirm, input, password, select } from '@inquirer/prompts';

import type { StorageStrategy } from '../types/domain.js';

export interface LoginPromptResult {
  username: string;
  accessKey: string;
  storageStrategy: StorageStrategy;
  allowPlainText: boolean;
  masterKey?: string;
}

export async function promptForLogin(): Promise<LoginPromptResult> {
  const username = await input({ message: 'BrowserStack username' });
  const accessKey = await password({ message: 'BrowserStack access key', mask: true });
  const storageStrategy = await select<StorageStrategy>({
    message: 'Credential storage',
    choices: [
      { name: 'Auto', value: 'auto', description: 'Prefer OS keychain, else encrypted file' },
      { name: 'Keychain', value: 'keychain', description: 'OS keychain / credential store' },
      {
        name: 'Encrypted file',
        value: 'encrypted-file',
        description: 'AES-encrypted file in the user config directory',
      },
      {
        name: 'Plain file',
        value: 'plain-file',
        description: 'Least secure. Requires explicit confirmation.',
      },
    ],
  });

  let masterKey: string | undefined;
  let allowPlainText = false;

  if (storageStrategy === 'encrypted-file' || storageStrategy === 'auto') {
    masterKey = await password({
      message:
        'Master key for encrypted storage (leave empty to rely on keychain/auto fallback if available)',
      mask: true,
    });
    masterKey = masterKey || undefined;
  }

  if (storageStrategy === 'plain-file') {
    allowPlainText = await confirm({
      message: 'Store credentials as plain text in your user config directory?',
      default: false,
    });
  }

  return { username, accessKey, storageStrategy, allowPlainText, masterKey };
}

export async function promptForJsonPayload(message: string): Promise<unknown> {
  const raw = await input({
    message,
    default: '{}',
  });

  return JSON.parse(raw);
}
