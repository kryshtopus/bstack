import { describe, expect, it } from 'vitest';

import { BrowserStackHttpClient } from '../api/http/BrowserStackHttpClient.js';

describe('BrowserStackHttpClient', () => {
  it('builds a correct HTTP Basic Authorization header', () => {
    const client = new BrowserStackHttpClient({
      username: 'alice',
      accessKey: 'super-secret',
      storageStrategy: 'plain-file',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(client.getAuthHeader()).toBe(
      `Basic ${Buffer.from('alice:super-secret').toString('base64')}`,
    );
  });
});
