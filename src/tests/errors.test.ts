import { describe, expect, it } from 'vitest';

import { BrowserStackApiError } from '../api/http/errors.js';

describe('BrowserStackApiError', () => {
  it('marks rate limits as retryable', () => {
    const error = new BrowserStackApiError({
      statusCode: 429,
      code: 'RATE_LIMIT',
      message: 'Too many requests',
      retryable: true,
    });

    expect(error.retryable).toBe(true);
    expect(error.statusCode).toBe(429);
  });
});
