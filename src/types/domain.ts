export type FrameworkKey =
  | 'auth'
  | 'appium'
  | 'maestro'
  | 'espresso'
  | 'flutter-android'
  | 'flutter-ios'
  | 'detox-android'
  | 'xcuitest'
  | 'media';

export type ResourceKey =
  | 'auth'
  | 'apps'
  | 'test-suites'
  | 'test-packages'
  | 'app-client'
  | 'builds'
  | 'sessions'
  | 'media'
  | 'plan';

export type OperationKey =
  | 'validate'
  | 'status'
  | 'list'
  | 'list-group'
  | 'get'
  | 'upload'
  | 'delete'
  | 'run'
  | 'stop'
  | 'update-status'
  | 'usage';

export type StorageStrategy = 'auto' | 'keychain' | 'encrypted-file' | 'plain-file';
export type AuthSource = 'environment' | 'keychain' | 'encrypted-file' | 'plain-file';
export type ConnectionState = 'connected' | 'saved-unvalidated' | 'invalid' | 'disconnected';

export interface StoredSession {
  username: string;
  accessKey: string;
  storageStrategy: Exclude<StorageStrategy, 'auto'>;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStatus {
  loggedIn: boolean;
  storageStrategy?: Exclude<StorageStrategy, 'auto'>;
  username?: string;
  savedAt?: string;
  authSource?: AuthSource;
  connectionState?: ConnectionState;
  lastValidatedAt?: string;
  lastValidationError?: string;
  currentFramework?: FrameworkKey;
  lastActionLabel?: string;
  lastActionAt?: string;
}

export interface AuthStatus {
  valid: boolean;
  username: string;
  planName?: string;
  parallelSessionsRunning?: number;
  parallelSessionsMaxAllowed?: number;
  queuedSessions?: number;
  queuedSessionsMaxAllowed?: number;
}

export interface UploadedArtifact {
  id?: string;
  url?: string;
  name?: string;
  version?: string;
  uploadedAt?: string;
  expiry?: string;
  customId?: string;
  shareableId?: string;
  framework?: string;
  raw: unknown;
}

export interface BuildSummary {
  id: string;
  name?: string;
  project?: string;
  status?: string;
  duration?: number | string;
  startTime?: string;
  browserUrl?: string;
  raw: unknown;
}

export interface SessionSummary {
  id: string;
  name?: string;
  status?: string;
  device?: string;
  os?: string;
  osVersion?: string;
  browserUrl?: string;
  publicUrl?: string;
  buildId?: string;
  buildName?: string;
  raw: unknown;
}

export interface ApiErrorShape {
  statusCode?: number;
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface LastResponseRecord {
  at: string;
  command?: string;
  framework?: FrameworkKey;
  resource?: ResourceKey;
  operation?: OperationKey;
  payload: unknown;
}
