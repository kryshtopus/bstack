import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getConfigPath, getLastResponsePath } from '../config/paths.js';
import type {
  LastResponseRecord,
  SessionStatus,
  StorageStrategy,
  StoredSession,
} from '../types/domain.js';
import { ensureDir } from '../utils/files.js';

import type { CredentialStore } from './CredentialStore.js';
import { EncryptedFileCredentialStore, PlainFileCredentialStore } from './FileCredentialStores.js';
import { KeytarCredentialStore } from './KeytarCredentialStore.js';

interface SessionConfig {
  storageStrategy?: Exclude<StorageStrategy, 'auto'>;
  username?: string;
  updatedAt?: string;
  lastValidatedAt?: string;
  lastValidationError?: string;
  currentFramework?: SessionStatus['currentFramework'];
  lastActionLabel?: string;
  lastActionAt?: string;
}

export class SessionRepository {
  private readonly keytarStore = new KeytarCredentialStore();
  private readonly encryptedFileStore = new EncryptedFileCredentialStore();
  private readonly plainFileStore = new PlainFileCredentialStore();

  public async resolveStrategy(
    preferred: StorageStrategy,
    options?: { masterKey?: string; allowPlainText?: boolean },
  ): Promise<Exclude<StorageStrategy, 'auto'>> {
    if (preferred === 'keychain') {
      if (await this.keytarStore.isAvailable()) {
        return 'keychain';
      }

      throw new Error('OS keychain support is unavailable. Use encrypted-file or plain-file.');
    }

    if (preferred === 'encrypted-file') {
      if (!options?.masterKey) {
        throw new Error(
          'Encrypted-file storage requires a master key. Set BSAA_MASTER_KEY or choose a different storage strategy.',
        );
      }

      return 'encrypted-file';
    }

    if (preferred === 'plain-file') {
      if (!options?.allowPlainText) {
        throw new Error(
          'Plain-file storage is disabled by default. Re-run with --allow-plain-storage to confirm.',
        );
      }

      return 'plain-file';
    }

    if (await this.keytarStore.isAvailable()) {
      return 'keychain';
    }

    if (options?.masterKey) {
      return 'encrypted-file';
    }

    if (options?.allowPlainText) {
      return 'plain-file';
    }

    throw new Error(
      'Auto storage could not resolve a secure backend. Set BSAA_MASTER_KEY for encrypted-file storage, or use --allow-plain-storage for plain-file fallback.',
    );
  }

  public async save(
    session: StoredSession,
    options?: { masterKey?: string; allowPlainText?: boolean },
  ): Promise<void> {
    const store = await this.getStore(session.storageStrategy);
    await store.save(session, options);
    await this.saveConfig({
      storageStrategy: session.storageStrategy,
      username: session.username,
      updatedAt: session.updatedAt,
    });
  }

  public async load(options?: { masterKey?: string }): Promise<StoredSession | null> {
    const config = await this.readConfig();
    if (!config.storageStrategy) {
      return null;
    }

    const store = await this.getStore(config.storageStrategy);
    return store.load(options);
  }

  public async clear(): Promise<void> {
    await this.keytarStore.clear();
    await this.encryptedFileStore.clear();
    await this.plainFileStore.clear();
    await this.saveConfig({});
  }

  public async getStatus(): Promise<SessionStatus> {
    const config = await this.readConfig();
    return {
      loggedIn: Boolean(config.username && config.storageStrategy),
      storageStrategy: config.storageStrategy,
      username: config.username,
      savedAt: config.updatedAt,
      authSource: config.storageStrategy,
      connectionState: config.username && config.storageStrategy ? 'saved-unvalidated' : 'disconnected',
      lastValidatedAt: config.lastValidatedAt,
      lastValidationError: config.lastValidationError,
      currentFramework: config.currentFramework,
      lastActionLabel: config.lastActionLabel,
      lastActionAt: config.lastActionAt,
    };
  }

  public async noteValidationSuccess(username: string): Promise<void> {
    const config = await this.readConfig();
    await this.saveConfig({
      ...config,
      username,
      lastValidatedAt: new Date().toISOString(),
      lastValidationError: undefined,
    });
  }

  public async noteValidationFailure(message: string): Promise<void> {
    const config = await this.readConfig();
    await this.saveConfig({
      ...config,
      lastValidationError: message,
    });
  }

  public async setCurrentFramework(framework: SessionStatus['currentFramework']): Promise<void> {
    const config = await this.readConfig();
    await this.saveConfig({
      ...config,
      currentFramework: framework,
    });
  }

  public async noteAction(label: string): Promise<void> {
    const config = await this.readConfig();
    await this.saveConfig({
      ...config,
      lastActionLabel: label,
      lastActionAt: new Date().toISOString(),
    });
  }

  public async saveLastResponse(record: LastResponseRecord): Promise<void> {
    await ensureDir(path.dirname(getLastResponsePath()));
    await writeFile(getLastResponsePath(), JSON.stringify(record, null, 2), 'utf8');
  }

  public async getLastResponse(): Promise<LastResponseRecord | null> {
    try {
      const raw = await readFile(getLastResponsePath(), 'utf8');
      return JSON.parse(raw) as LastResponseRecord;
    } catch {
      return null;
    }
  }

  private async getStore(
    strategy: Exclude<StorageStrategy, 'auto'>,
  ): Promise<CredentialStore> {
    switch (strategy) {
      case 'keychain':
        return this.keytarStore;
      case 'encrypted-file':
        return this.encryptedFileStore;
      case 'plain-file':
        return this.plainFileStore;
    }
  }

  private async readConfig(): Promise<SessionConfig> {
    try {
      const raw = await readFile(getConfigPath(), 'utf8');
      return JSON.parse(raw) as SessionConfig;
    } catch {
      return {};
    }
  }

  private async saveConfig(config: SessionConfig): Promise<void> {
    await ensureDir(path.dirname(getConfigPath()));
    await writeFile(getConfigPath(), JSON.stringify(config, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}
