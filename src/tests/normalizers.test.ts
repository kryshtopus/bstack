import { describe, expect, it } from 'vitest';

import {
  normalizeArtifact,
  normalizeBuildSummary,
  normalizeSessionSummary,
} from '../api/normalizers/common.js';

describe('normalizers', () => {
  it('normalizes uploaded artifacts', () => {
    const artifact = normalizeArtifact({
      app_name: 'MyApp',
      app_id: 'app-123',
      app_url: 'bs://app-123',
      custom_id: 'SampleApp',
      uploaded_at: '2026-01-01T00:00:00Z',
    });

    expect(artifact).toMatchObject({
      id: 'app-123',
      name: 'MyApp',
      url: 'bs://app-123',
      customId: 'SampleApp',
    });
  });

  it('normalizes build summaries', () => {
    const build = normalizeBuildSummary({
      automation_build: {
        hashed_id: 'build-123',
        name: 'Nightly',
        status: 'done',
      },
    });

    expect(build).toMatchObject({ id: 'build-123', name: 'Nightly', status: 'done' });
  });

  it('normalizes session summaries', () => {
    const session = normalizeSessionSummary({
      automation_session: {
        hashed_id: 'session-123',
        device: 'iPhone 15',
        status: 'done',
      },
    });

    expect(session).toMatchObject({
      id: 'session-123',
      device: 'iPhone 15',
      status: 'done',
    });
  });
});
