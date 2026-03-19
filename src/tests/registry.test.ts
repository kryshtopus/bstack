import { describe, expect, it } from 'vitest';

import { EndpointRegistry } from '../api/registry/EndpointRegistry.js';
import { endpointDefinitions } from '../api/registry/definitions.js';

describe('EndpointRegistry', () => {
  it('resolves templated paths from the registry', () => {
    const registry = new EndpointRegistry(endpointDefinitions);

    const resolved = registry.resolve('xcuitest', 'sessions', 'get', {
      buildId: 'build-123',
      sessionId: 'session-456',
    });

    expect(resolved.path).toBe('/app-automate/xcuitest/v2/builds/build-123/sessions/session-456');
  });
});
