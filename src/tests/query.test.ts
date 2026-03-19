import { describe, expect, it } from 'vitest';

import { buildQuery } from '../utils/query.js';

describe('buildQuery', () => {
  it('omits nullish and empty values while preserving arrays', () => {
    const params = buildQuery({
      custom_id: 'SampleApp',
      scope: 'group',
      limit: 10,
      offset: undefined,
      tags: ['a', 'b'],
      empty: '',
    });

    expect(params.toString()).toBe('custom_id=SampleApp&scope=group&limit=10&tags=a&tags=b');
  });
});
