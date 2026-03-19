import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SessionRepository', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('persists and reloads plain-file sessions in the user config directory', async () => {
    const configRoot = await mkdtemp(path.join(os.tmpdir(), 'bstack-config-'));
    process.env.XDG_CONFIG_HOME = configRoot;

    const { SessionRepository } = await import('../storage/SessionRepository.js');
    const repository = new SessionRepository();

    await repository.save({
      username: 'alice',
      accessKey: 'secret',
      storageStrategy: 'plain-file',
      createdAt: '2026-03-19T00:00:00.000Z',
      updatedAt: '2026-03-19T00:00:00.000Z',
    });

    const loaded = await repository.load();

    expect(loaded).toMatchObject({
      username: 'alice',
      accessKey: 'secret',
      storageStrategy: 'plain-file',
    });
  });
});
