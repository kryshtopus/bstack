import type { StoredSession } from '../types/domain.js';
import { KEYTAR_SERVICE } from '../utils/constants.js';

import type { CredentialStore } from './CredentialStore.js';

const ACCOUNT_NAME = 'bstack';

interface KeytarModule {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

async function loadKeytar(): Promise<KeytarModule | null> {
  try {
    const module = await import('keytar');
    return module.default ?? (module as unknown as KeytarModule);
  } catch {
    return null;
  }
}

export class KeytarCredentialStore implements CredentialStore {
  public readonly kind = 'keychain' as const;

  public async isAvailable(): Promise<boolean> {
    return (await loadKeytar()) !== null;
  }

  public async save(session: StoredSession): Promise<void> {
    const keytar = await loadKeytar();
    if (!keytar) {
      throw new Error('OS keychain support is unavailable on this system.');
    }

    await keytar.setPassword(KEYTAR_SERVICE, ACCOUNT_NAME, JSON.stringify(session));
  }

  public async load(): Promise<StoredSession | null> {
    const keytar = await loadKeytar();
    if (!keytar) {
      return null;
    }

    const raw = await keytar.getPassword(KEYTAR_SERVICE, ACCOUNT_NAME);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  public async clear(): Promise<void> {
    const keytar = await loadKeytar();
    if (!keytar) {
      return;
    }

    await keytar.deletePassword(KEYTAR_SERVICE, ACCOUNT_NAME);
  }
}
