import type { StoredSession } from '../types/domain.js';

export interface CredentialStore {
  readonly kind: 'keychain' | 'encrypted-file' | 'plain-file';
  save(session: StoredSession, options?: { masterKey?: string }): Promise<void>;
  load(options?: { masterKey?: string }): Promise<StoredSession | null>;
  clear(): Promise<void>;
}
