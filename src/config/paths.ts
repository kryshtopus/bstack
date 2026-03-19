import envPaths from 'env-paths';
import path from 'node:path';

import {
  CONFIG_BASENAME,
  ENCRYPTED_SESSION_BASENAME,
  LAST_RESPONSE_BASENAME,
  PLAIN_SESSION_BASENAME,
} from '../utils/constants.js';

function resolvePaths() {
  return envPaths('bstack', { suffix: '' });
}

export function getConfigDir(): string {
  return resolvePaths().config;
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_BASENAME);
}

export function getEncryptedSessionPath(): string {
  return path.join(getConfigDir(), ENCRYPTED_SESSION_BASENAME);
}

export function getPlainSessionPath(): string {
  return path.join(getConfigDir(), PLAIN_SESSION_BASENAME);
}

export function getLastResponsePath(): string {
  return path.join(getConfigDir(), LAST_RESPONSE_BASENAME);
}
