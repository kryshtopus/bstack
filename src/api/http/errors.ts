import type { AxiosError } from 'axios';

import type { ApiErrorShape } from '../../types/domain.js';

export class BrowserStackApiError extends Error {
  public readonly statusCode?: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly retryable: boolean;

  public constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'BrowserStackApiError';
    this.statusCode = shape.statusCode;
    this.code = shape.code;
    this.details = shape.details;
    this.retryable = shape.retryable;
  }
}

export function isRetryableStatus(statusCode?: number): boolean {
  return statusCode === 429 || Boolean(statusCode && statusCode >= 500);
}

export function mapAxiosError(error: AxiosError): BrowserStackApiError {
  const statusCode = error.response?.status;
  const message =
    typeof error.response?.data === 'string'
      ? error.response.data
      : error.message || 'BrowserStack API request failed.';

  return new BrowserStackApiError({
    statusCode,
    code: error.code ?? 'HTTP_ERROR',
    message,
    details: error.response?.data,
    retryable: isRetryableStatus(statusCode) || error.code === 'ECONNABORTED',
  });
}
