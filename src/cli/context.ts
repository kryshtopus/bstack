import ora from 'ora';

import { AuthService } from '../auth/AuthService.js';
import { BrowserStackHttpClient } from '../api/http/BrowserStackHttpClient.js';
import { EndpointRegistry } from '../api/registry/EndpointRegistry.js';
import { endpointDefinitions } from '../api/registry/definitions.js';
import { ResourceService } from '../services/ResourceService.js';
import { SessionRepository } from '../storage/SessionRepository.js';
import type { AuthStatus, LastResponseRecord, SessionStatus, StoredSession } from '../types/domain.js';
import { asError } from '../utils/errors.js';

import { Output } from './output.js';

export interface GlobalCliOptions {
  json?: boolean;
  debugHttp?: boolean;
  verbose?: boolean;
  allowPlainStorage?: boolean;
  masterKey?: string;
  baseUrl?: string;
}

export class CommandRuntime {
  private readonly repository = new SessionRepository();
  private readonly registry = new EndpointRegistry(endpointDefinitions);
  public readonly output: Output;
  public readonly auth: AuthService;

  public constructor(public readonly options: GlobalCliOptions) {
    this.output = new Output({ json: options.json });
    this.auth = new AuthService(this.repository, (session) => this.createHttpClient(session));
  }

  public async requireSession(): Promise<StoredSession> {
    const { session } = await this.auth.getActiveSession(this.options.masterKey);
    if (!session) {
      throw new Error('No saved BrowserStack session found. Run `bsaa login` first.');
    }

    return session;
  }

  public async getResourceService(): Promise<ResourceService> {
    const session = await this.requireSession();
    return new ResourceService(this.registry, this.createHttpClient(session));
  }

  public getRegistry(): EndpointRegistry {
    return this.registry;
  }

  public async saveLastResponse(record: Omit<LastResponseRecord, 'at'>): Promise<void> {
    await this.repository.saveLastResponse({
      ...record,
      at: new Date().toISOString(),
    });
    await this.repository.noteAction(
      [record.framework, record.resource, record.operation].filter(Boolean).join(' / ') ||
        record.command ||
        'Action completed',
    );
  }

  public async getLastResponse(): Promise<LastResponseRecord | null> {
    return this.repository.getLastResponse();
  }

  public async getSessionStatus(): Promise<SessionStatus> {
    return this.auth.status();
  }

  public async getDashboardSnapshot(options?: {
    refreshValidation?: boolean;
  }): Promise<{
    sessionStatus: SessionStatus;
    authStatus?: AuthStatus;
    lastResponse?: LastResponseRecord | null;
  }> {
    const sessionStatus = await this.getSessionStatus();
    let authStatus: AuthStatus | undefined;

    if (sessionStatus.loggedIn && options?.refreshValidation) {
      const { session } = await this.auth.getActiveSession(this.options.masterKey);
      if (session) {
        try {
          authStatus = await this.auth.validate(session);
        } catch {
          // The dashboard will use stored validation status and error hints instead.
        }
      }
    }

    const refreshedStatus = await this.getSessionStatus();
    return {
      sessionStatus: {
        ...refreshedStatus,
        connectionState: authStatus?.valid
          ? 'connected'
          : refreshedStatus.lastValidationError
            ? 'invalid'
            : refreshedStatus.loggedIn
              ? 'saved-unvalidated'
              : 'disconnected',
      },
      authStatus,
      lastResponse: await this.getLastResponse(),
    };
  }

  public async setCurrentFramework(framework: SessionStatus['currentFramework']): Promise<void> {
    await this.repository.setCurrentFramework(framework);
  }

  public async exportLastResponse(targetPath: string, force = false): Promise<void> {
    const last = await this.repository.getLastResponse();
    if (!last) {
      throw new Error('No saved response is available to export yet.');
    }

    const { fileExists } = await import('../utils/files.js');
    if (!force && (await fileExists(targetPath))) {
      throw new Error(`File already exists: ${targetPath}. Re-run with --force to overwrite.`);
    }

    const { writeFile } = await import('node:fs/promises');
    await writeFile(targetPath, JSON.stringify(last, null, 2), 'utf8');
  }

  public spinner(text: string) {
    return ora({ text, isSilent: this.options.json }).start();
  }

  public async runWithSpinner<T>(text: string, task: () => Promise<T>): Promise<T> {
    const spinner = this.spinner(text);
    try {
      const result = await task();
      spinner.succeed(text);
      return result;
    } catch (error) {
      spinner.fail(asError(error).message);
      throw error;
    }
  }

  private createHttpClient(session: StoredSession): BrowserStackHttpClient {
    return new BrowserStackHttpClient(session, {
      baseUrl: this.options.baseUrl,
      debugHttp: this.options.debugHttp,
    });
  }
}
