import type { BrowserStackHttpClient } from '../api/http/BrowserStackHttpClient.js';
import type { AuthSource, AuthStatus, StorageStrategy, StoredSession } from '../types/domain.js';

import type { SessionRepository } from '../storage/SessionRepository.js';

export interface LoginInput {
  username: string;
  accessKey: string;
  storageStrategy: StorageStrategy;
  allowPlainText: boolean;
  masterKey?: string;
}

export class AuthService {
  public constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly httpFactory: (session: StoredSession) => BrowserStackHttpClient,
  ) {}

  public async login(input: LoginInput): Promise<AuthStatus> {
    const strategy = await this.sessionRepository.resolveStrategy(input.storageStrategy, {
      masterKey: input.masterKey,
      allowPlainText: input.allowPlainText,
    });

    const now = new Date().toISOString();
    const session: StoredSession = {
      username: input.username,
      accessKey: input.accessKey,
      storageStrategy: strategy,
      createdAt: now,
      updatedAt: now,
    };

    const status = await this.validate(session);
    await this.sessionRepository.save(session, {
      masterKey: input.masterKey,
      allowPlainText: input.allowPlainText,
    });
    return status;
  }

  public async logout(): Promise<void> {
    await this.sessionRepository.clear();
  }

  public async getStoredSession(masterKey?: string): Promise<StoredSession | null> {
    return this.sessionRepository.load({ masterKey });
  }

  public async getActiveSession(masterKey?: string): Promise<{
    session: StoredSession | null;
    source?: AuthSource;
  }> {
    const envUsername = process.env.BSTACK_USERNAME;
    const envAccessKey = process.env.BSTACK_ACCESS_KEY;

    if (envUsername && envAccessKey) {
      return {
        session: {
          username: envUsername,
          accessKey: envAccessKey,
          storageStrategy: 'plain-file',
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        source: 'environment',
      };
    }

    const stored = await this.getStoredSession(masterKey);
    return {
      session: stored,
      source: stored?.storageStrategy,
    };
  }

  public async status(): Promise<Awaited<ReturnType<SessionRepository['getStatus']>>> {
    const stored = await this.sessionRepository.getStatus();
    const envUsername = process.env.BSTACK_USERNAME;
    const envAccessKey = process.env.BSTACK_ACCESS_KEY;

    if (envUsername && envAccessKey) {
      return {
        ...stored,
        loggedIn: true,
        username: envUsername,
        authSource: 'environment',
        connectionState: stored.lastValidatedAt ? 'connected' : 'saved-unvalidated',
      };
    }

    return stored;
  }

  public async validate(session: StoredSession): Promise<AuthStatus> {
    const http = this.httpFactory(session);
    try {
      const response = await http.requestJson<Record<string, unknown>>({
        method: 'GET',
        path: '/app-automate/plan.json',
      });
      await this.sessionRepository.noteValidationSuccess(session.username);

      return {
        valid: true,
        username: session.username,
        planName: asString(response.automate_plan),
        parallelSessionsRunning: asNumber(response.parallel_sessions_running),
        parallelSessionsMaxAllowed: asNumber(response.parallel_sessions_max_allowed),
        queuedSessions: asNumber(response.queued_sessions),
        queuedSessionsMaxAllowed: asNumber(response.queued_sessions_max_allowed),
      };
    } catch (error) {
      await this.sessionRepository.noteValidationFailure(
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
