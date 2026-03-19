import axios, { type AxiosInstance, type AxiosRequestConfig, type Method } from 'axios';

import type { StoredSession } from '../../types/domain.js';
import {
  DEFAULT_BASE_URL,
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_RETRY_ATTEMPTS,
} from '../../utils/constants.js';
import { buildQuery } from '../../utils/query.js';

import { BrowserStackApiError, isRetryableStatus, mapAxiosError } from './errors.js';
import type { MultipartInput } from './multipart.js';
import { buildMultipartPayload } from './multipart.js';

export interface HttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  debugHttp?: boolean;
}

export interface RequestOptions {
  method: Method;
  path: string;
  query?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
}

export class BrowserStackHttpClient {
  private readonly client: AxiosInstance;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;

  public constructor(
    private readonly session: StoredSession,
    private readonly options: HttpClientOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;
    this.retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.client = axios.create({
      baseURL: options.baseUrl ?? process.env.BSTACK_BASE_URL ?? DEFAULT_BASE_URL,
      timeout: this.timeoutMs,
      auth: {
        username: session.username,
        password: session.accessKey,
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  public getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.session.username}:${this.session.accessKey}`).toString('base64')}`;
  }

  public async requestRaw<T = unknown>(options: RequestOptions): Promise<T> {
    return this.performRequest<T>({
      method: options.method,
      url: this.buildPath(options.path, options.query),
      data: options.data,
      headers: options.headers,
    });
  }

  public async requestJson<T = unknown>(options: RequestOptions): Promise<T> {
    return this.requestRaw<T>(options);
  }

  public async uploadMultipart<T = unknown>(
    path: string,
    input: MultipartInput,
    fields?: Record<string, unknown>,
  ): Promise<T> {
    const { form, headers } = await buildMultipartPayload({
      ...input,
      fields: normalizeFormFields(fields),
    });

    return this.performRequest<T>({
      method: 'POST',
      url: path,
      data: form,
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  private async performRequest<T>(config: AxiosRequestConfig): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        if (this.options.debugHttp) {
          const method = String(config.method ?? 'GET').toUpperCase();
          process.stderr.write(`[http] ${method} ${config.url}\n`);
        }

        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error) {
        attempt += 1;

        if (axios.isAxiosError(error)) {
          const mapped = mapAxiosError(error);

          if (attempt < this.retryAttempts && mapped.retryable) {
            await sleep(backoffMs(attempt, mapped.statusCode));
            continue;
          }

          throw mapped;
        }

        const fallback = new BrowserStackApiError({
          code: 'UNKNOWN_HTTP_ERROR',
          message: error instanceof Error ? error.message : 'Unknown HTTP error',
          retryable: false,
        });

        if (attempt < this.retryAttempts && isRetryableStatus(fallback.statusCode)) {
          await sleep(backoffMs(attempt, fallback.statusCode));
          continue;
        }

        throw fallback;
      }
    }
  }

  private buildPath(path: string, query?: Record<string, unknown>): string {
    const params = buildQuery(query ?? {});
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number, statusCode?: number): number {
  const base = statusCode === 429 ? 1_500 : 700;
  return base * 2 ** (attempt - 1);
}

function normalizeFormFields(
  input?: Record<string, unknown>,
): Record<string, string | number | boolean | undefined> {
  const normalized: Record<string, string | number | boolean | undefined> = {};

  for (const [key, value] of Object.entries(input ?? {})) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
    }
  }

  return normalized;
}
