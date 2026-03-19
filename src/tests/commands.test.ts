import { describe, expect, it, vi } from 'vitest';

import { createAuthCommands } from '../commands/auth.js';
import { createFrameworkCommands } from '../commands/framework.js';
import { EndpointRegistry } from '../api/registry/EndpointRegistry.js';
import { endpointDefinitions } from '../api/registry/definitions.js';

describe('command handlers', () => {
  it('runs auth status and emits the stored session state', async () => {
    const emit = vi.fn();
    const runtime = {
      auth: {
        status: vi.fn().mockResolvedValue({ loggedIn: true, username: 'alice' }),
      },
      output: { emit, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
    } as unknown as Parameters<typeof createAuthCommands>[0];

    const command = createAuthCommands(runtime);
    await command.parseAsync(['status'], { from: 'user' });

    expect(emit).toHaveBeenCalledWith({ loggedIn: true, username: 'alice' });
  });

  it('runs appium builds get and stores the response', async () => {
    const execute = vi.fn().mockResolvedValue({ build: 'ok' });
    const saveLastResponse = vi.fn();
    const emit = vi.fn();
    const runtime = {
      getRegistry: () => new EndpointRegistry(endpointDefinitions),
      getResourceService: vi.fn().mockResolvedValue({ execute }),
      saveLastResponse,
      output: { emit, success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
    } as unknown as Parameters<typeof createFrameworkCommands>[0];

    const appium = createFrameworkCommands(runtime).find((command) => command.name() === 'appium');
    expect(appium).toBeDefined();

    await appium!.parseAsync(['builds', 'get', 'build-123'], {
      from: 'user',
    });

    expect(execute).toHaveBeenCalledWith({
      framework: 'appium',
      resource: 'builds',
      operation: 'get',
      pathParams: { buildID: 'build-123' },
    });
    expect(saveLastResponse).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith({ build: 'ok' });
  });
});
