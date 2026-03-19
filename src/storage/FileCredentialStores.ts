import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

import { getEncryptedSessionPath, getPlainSessionPath } from '../config/paths.js';
import type { StoredSession } from '../types/domain.js';
import { asError } from '../utils/errors.js';

import type { CredentialStore } from './CredentialStore.js';
import { deleteFileIfExists, readTextFile, writePrivateFile } from './FileStorage.js';

interface EncryptedPayload {
  iv: string;
  salt: string;
  authTag: string;
  ciphertext: string;
}

export class EncryptedFileCredentialStore implements CredentialStore {
  public readonly kind = 'encrypted-file' as const;

  public async save(session: StoredSession, options?: { masterKey?: string }): Promise<void> {
    const masterKey = options?.masterKey;
    if (!masterKey) {
      throw new Error(
        'Encrypted file storage requires a master key. Set BSAA_MASTER_KEY or provide one interactively.',
      );
    }

    const payload = encryptPayload(session, masterKey);
    await writePrivateFile(getEncryptedSessionPath(), JSON.stringify(payload, null, 2));
  }

  public async load(options?: { masterKey?: string }): Promise<StoredSession | null> {
    const encrypted = await readTextFile(getEncryptedSessionPath());
    if (!encrypted) {
      return null;
    }

    const masterKey = options?.masterKey;
    if (!masterKey) {
      throw new Error(
        'Stored session is encrypted. Set BSAA_MASTER_KEY or login again with a different storage strategy.',
      );
    }

    try {
      return decryptPayload(JSON.parse(encrypted) as EncryptedPayload, masterKey);
    } catch (error) {
      throw new Error(`Unable to decrypt saved session: ${asError(error).message}`);
    }
  }

  public async clear(): Promise<void> {
    await deleteFileIfExists(getEncryptedSessionPath());
  }
}

export class PlainFileCredentialStore implements CredentialStore {
  public readonly kind = 'plain-file' as const;

  public async save(session: StoredSession): Promise<void> {
    await writePrivateFile(getPlainSessionPath(), JSON.stringify(session, null, 2));
  }

  public async load(): Promise<StoredSession | null> {
    const raw = await readTextFile(getPlainSessionPath());
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  public async clear(): Promise<void> {
    await deleteFileIfExists(getPlainSessionPath());
  }
}

function encryptPayload(payload: StoredSession, masterKey: string): EncryptedPayload {
  const iv = randomBytes(12);
  const salt = randomBytes(16);
  const key = scryptSync(masterKey, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);

  return {
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptPayload(payload: EncryptedPayload, masterKey: string): StoredSession {
  const key = scryptSync(masterKey, Buffer.from(payload.salt, 'base64'), 32);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8')) as StoredSession;
}
