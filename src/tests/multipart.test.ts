import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildMultipartPayload } from '../api/http/multipart.js';

const cleanupPaths: string[] = [];

describe('buildMultipartPayload', () => {
  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await Promise.all(cleanupPaths.map(async (dir) => rm(dir, { recursive: true, force: true })));
    cleanupPaths.length = 0;
  });

  it('builds multipart data for file uploads and custom fields', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'bstack-multipart-'));
    cleanupPaths.push(dir);
    const filePath = path.join(dir, 'sample.apk');
    await writeFile(filePath, 'sample');

    const payload = await buildMultipartPayload({
      filePath,
      fields: {
        custom_id: 'SampleApp',
      },
    });

    expect(payload.headers['content-type']).toContain('multipart/form-data');
    const streams = (payload.form as unknown as { _streams: unknown[] })._streams
      .map((chunk) => String(chunk))
      .join('');
    expect(streams).toContain('SampleApp');
  });
});
