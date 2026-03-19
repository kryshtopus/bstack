import { select, input } from '@inquirer/prompts';
import { Command } from 'commander';

import type { CommandRuntime } from '../cli/context.js';
import type { FrameworkKey, OperationKey, ResourceKey } from '../types/domain.js';

export function createExplorerCommand(runtime: CommandRuntime): Command {
  return new Command('explorer')
    .description('Interactive raw endpoint explorer backed by the endpoint registry')
    .action(async () => {
      const service = await runtime.getResourceService();
      const registry = service.getRegistry();
      const definitions = registry.list().filter((definition) => definition.framework !== 'auth');

      const framework = await select<FrameworkKey>({
        message: 'Framework',
        choices: unique(definitions.map((definition) => definition.framework)).map((value) => ({
          name: value,
          value,
        })),
      });

      const resource = await select<ResourceKey>({
        message: 'Resource',
        choices: unique(
          definitions
            .filter((definition) => definition.framework === framework)
            .map((definition) => definition.resource),
        ).map((value) => ({ name: value, value })),
      });

      const operation = await select<OperationKey>({
        message: 'Operation',
        choices: definitions
          .filter(
            (definition) =>
              definition.framework === framework && definition.resource === resource,
          )
          .map((definition) => ({
            name: `${definition.operation} (${definition.method} ${definition.pathTemplate})`,
            value: definition.operation,
          })),
      });

      const definition = registry.find(framework, resource, operation);
      const pathParams = Object.fromEntries(
        await Promise.all(
          (definition.pathParams ?? []).map(async (param) => [
            param,
            await input({ message: `Path param ${param}` }),
          ]),
        ),
      );

      const query = Object.fromEntries(
        await Promise.all(
          (definition.queryParams ?? []).map(async (param) => [
            param,
            await input({ message: `Query param ${param} (optional)` }),
          ]),
        ),
      );

      let body: unknown;
      let filePath: string | undefined;
      let url: string | undefined;

      if (definition.requestKind === 'json' && ['run', 'update-status'].includes(operation)) {
        const raw = await input({ message: 'JSON body', default: '{}' });
        body = JSON.parse(raw) as unknown;
      }

      if (definition.requestKind === 'multipart') {
        const source = await select<'file' | 'url'>({
          message: 'Upload source',
          choices: [
            { name: 'Local file', value: 'file' },
            { name: 'Public URL', value: 'url' },
          ],
        });

        if (source === 'file') {
          filePath = await input({ message: 'File path' });
        } else {
          url = await input({ message: 'Public URL' });
        }
      }

      const response = await service.execute({
        framework,
        resource,
        operation,
        pathParams,
        query,
        body,
        filePath,
        url,
      });

      await runtime.saveLastResponse({
        command: 'explorer',
        framework,
        resource,
        operation,
        payload: response,
      });

      runtime.output.emit(response);
    });
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
