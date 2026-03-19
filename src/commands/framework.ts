import { Command } from 'commander';

import {
  normalizeArtifactCollection,
  normalizeSessionCollection,
} from '../api/normalizers/common.js';
import { getFrameworkDescriptor, validateUploadPath } from '../services/frameworkConfigs.js';
import type { CommandRuntime } from '../cli/context.js';
import type { FrameworkKey, ResourceKey } from '../types/domain.js';
import { parseJsonInput } from '../utils/json.js';

type ResourceCommandName = 'apps' | 'suites' | 'packages' | 'app-client' | 'builds' | 'sessions';

const resourceNameMap: Record<ResourceCommandName, ResourceKey> = {
  apps: 'apps',
  suites: 'test-suites',
  packages: 'test-packages',
  'app-client': 'app-client',
  builds: 'builds',
  sessions: 'sessions',
};

export function createFrameworkCommands(runtime: CommandRuntime): Command[] {
  const supportedFrameworks: FrameworkKey[] = [
    'appium',
    'maestro',
    'espresso',
    'flutter-android',
    'flutter-ios',
    'detox-android',
    'xcuitest',
    'media',
  ];

  return supportedFrameworks.map((framework) => createFrameworkCommand(runtime, framework));
}

function createFrameworkCommand(runtime: CommandRuntime, framework: FrameworkKey): Command {
  const descriptor = getFrameworkDescriptor(framework);
  const command = new Command(framework).description(descriptor?.docsSummary ?? framework);

  attachArtifactCommands(command, runtime, framework, 'apps');
  attachArtifactCommands(command, runtime, framework, 'suites');
  attachArtifactCommands(command, runtime, framework, 'packages');
  attachArtifactCommands(command, runtime, framework, 'app-client');
  attachBuildCommands(command, runtime, framework);
  attachSessionCommands(command, runtime, framework);

  if (framework === 'media') {
    const media = new Command('media').description('Manage uploaded media files');
    attachMediaCommands(media, runtime);
    return media;
  }

  return command;
}

function attachArtifactCommands(
  parent: Command,
  runtime: CommandRuntime,
  framework: FrameworkKey,
  resourceName: ResourceCommandName,
): void {
  const resource = resourceNameMap[resourceName];
  const servicePromise = () => runtime.getResourceService();
  const registry = servicePromise;

  const uploadAvailable = hasEndpoint(runtime, framework, resource, 'upload');
  const listAvailable = hasEndpoint(runtime, framework, resource, 'list');
  const getAvailable = hasEndpoint(runtime, framework, resource, 'get');
  const deleteAvailable = hasEndpoint(runtime, framework, resource, 'delete');

  if (!uploadAvailable && !listAvailable && !getAvailable && !deleteAvailable) {
    return;
  }

  const command = new Command(resourceName).description(`Manage ${resourceName} for ${framework}`);

  if (uploadAvailable) {
    command
      .command('upload <pathOrUrl>')
      .description(`Upload ${resourceName}`)
      .option('--custom-id <customId>', 'Custom ID')
      .option('--ios-keychain-support', 'Appium iOS keychain support')
      .action(async (pathOrUrl, options) => {
        const service = await registry();
        const isUrl = /^https?:\/\//i.test(pathOrUrl);
        if (!isUrl) {
          const warnings = validateUploadPath(framework, resource, pathOrUrl);
          warnings.forEach((warning) => runtime.output.warning(warning));
        }

        const response = await service.execute({
          framework,
          resource,
          operation: 'upload',
          filePath: isUrl ? undefined : pathOrUrl,
          url: isUrl ? pathOrUrl : undefined,
          fields: {
            custom_id: options.customId,
            ios_keychain_support: options.iosKeychainSupport ? 'true' : undefined,
          },
        });
        await runtime.saveLastResponse({
          command: `${framework} ${resourceName} upload`,
          framework,
          resource,
          operation: 'upload',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  if (listAvailable) {
    command
      .command('list')
      .description(`List ${resourceName}`)
      .option('--custom-id <customId>', 'Custom ID filter')
      .option('--scope <scope>', 'Resource scope: user or group')
      .option('--limit <limit>', 'Page size')
      .action(async (options) => {
        const service = await servicePromise();
        const operation =
          (framework === 'appium' || framework === 'media') && options.scope === 'group'
            ? 'list-group'
            : 'list';

        const response = await service.execute({
          framework,
          resource,
          operation,
          query: {
            custom_id: options.customId,
            scope: options.scope,
            limit: options.limit,
          },
        });

        await runtime.saveLastResponse({
          command: `${framework} ${resourceName} list`,
          framework,
          resource,
          operation,
          payload: response,
        });

        if (resource === 'apps' || resource === 'test-suites' || resource === 'test-packages') {
          const items = normalizeArtifactCollection(response);
          runtime.output.emit(items, () => runtime.output.tableFromArtifacts(items));
          return;
        }

        runtime.output.emit(response);
      });
  }

  if (getAvailable) {
    command
      .command('get <id>')
      .description(`Get ${resourceName} details`)
      .action(async (id) => {
        const service = await servicePromise();
        const pathParams = mapDetailId(resource, id);
        const response = await service.execute({
          framework,
          resource,
          operation: 'get',
          pathParams,
        });
        await runtime.saveLastResponse({
          command: `${framework} ${resourceName} get`,
          framework,
          resource,
          operation: 'get',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  if (deleteAvailable) {
    command
      .command('delete <id>')
      .description(`Delete ${resourceName}`)
      .option('-y, --yes', 'Skip confirmation')
      .action(async (id, options) => {
        if (!options.yes) {
          const { confirm } = await import('@inquirer/prompts');
          const accepted = await confirm({
            message: `Delete ${resourceName} ${id}?`,
            default: false,
          });
          if (!accepted) {
            runtime.output.warning('Delete cancelled.');
            return;
          }
        }

        const service = await servicePromise();
        const response = await service.execute({
          framework,
          resource,
          operation: 'delete',
          pathParams: mapDetailId(resource, id),
        });
        await runtime.saveLastResponse({
          command: `${framework} ${resourceName} delete`,
          framework,
          resource,
          operation: 'delete',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  parent.addCommand(command);
}

function attachBuildCommands(
  parent: Command,
  runtime: CommandRuntime,
  framework: FrameworkKey,
): void {
  if (!hasEndpoint(runtime, framework, 'builds', 'list')) {
    return;
  }

  const builds = new Command('builds').description(`Manage builds for ${framework}`);

  builds
    .command('list')
    .description('List builds')
    .option('--project <project>', 'Project filter')
    .option('--status <status>', 'Status filter')
    .option('--limit <limit>', 'Page size')
    .option('--offset <offset>', 'Offset for Appium')
    .action(async (options) => {
      const service = await runtime.getResourceService();
      const buildsList = await service.listBuilds(framework, {
        project: options.project,
        status: options.status,
        limit: options.limit,
        offset: options.offset,
      });
      await runtime.saveLastResponse({
        command: `${framework} builds list`,
        framework,
        resource: 'builds',
        operation: 'list',
        payload: buildsList,
      });
      runtime.output.emit(buildsList, () => runtime.output.tableFromBuilds(buildsList));
    });

  if (hasEndpoint(runtime, framework, 'builds', 'get')) {
    builds
      .command('get <buildId>')
      .description('Get build details')
      .action(async (buildId) => {
        const service = await runtime.getResourceService();
        const response = await service.execute({
          framework,
          resource: 'builds',
          operation: 'get',
          pathParams: framework === 'appium' ? { buildID: buildId } : { buildId },
        });
        await runtime.saveLastResponse({
          command: `${framework} builds get`,
          framework,
          resource: 'builds',
          operation: 'get',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  if (hasEndpoint(runtime, framework, 'builds', 'run')) {
    builds
      .command('run')
      .description('Execute a build using raw JSON input')
      .option('--data <json>', 'Inline JSON body')
      .option('--data-file <path>', 'JSON file to send')
      .action(async (options) => {
        const body = await readBodyOptions(options.data, options.dataFile);
        const service = await runtime.getResourceService();
        const response = await service.execute({
          framework,
          resource: 'builds',
          operation: 'run',
          body,
        });
        await runtime.saveLastResponse({
          command: `${framework} builds run`,
          framework,
          resource: 'builds',
          operation: 'run',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  if (hasEndpoint(runtime, framework, 'builds', 'stop')) {
    builds
      .command('stop <buildId>')
      .description('Stop a running build')
      .action(async (buildId) => {
        const service = await runtime.getResourceService();
        const response = await service.execute({
          framework,
          resource: 'builds',
          operation: 'stop',
          pathParams: { buildId },
        });
        runtime.output.emit(response);
      });
  }

  parent.addCommand(builds);
}

function attachSessionCommands(
  parent: Command,
  runtime: CommandRuntime,
  framework: FrameworkKey,
): void {
  if (
    !hasEndpoint(runtime, framework, 'sessions', 'get') &&
    !hasEndpoint(runtime, framework, 'sessions', 'list')
  ) {
    return;
  }

  const sessions = new Command('sessions').description(`Manage sessions for ${framework}`);

  if (framework === 'appium' || framework === 'maestro' || framework === 'espresso' || framework === 'flutter-android' || framework === 'flutter-ios' || framework === 'xcuitest') {
    sessions
      .command('list')
      .description('List sessions for a build')
      .requiredOption('--build <buildId>', 'Build identifier')
      .option('--status <status>', 'Status filter')
      .option('--limit <limit>', 'Page size')
      .option('--offset <offset>', 'Offset (Appium only)')
      .action(async (options) => {
        const service = await runtime.getResourceService();
        const items =
          framework === 'appium'
            ? normalizeSessionCollection(
                await service.execute({
                  framework,
                  resource: 'sessions',
                  operation: 'list',
                  pathParams: { buildID: options.build },
                  query: {
                    status: options.status,
                    limit: options.limit,
                    offset: options.offset,
                  },
                }),
              )
            : await service.getBuildSessions(framework, options.build);

        await runtime.saveLastResponse({
          command: `${framework} sessions list`,
          framework,
          resource: 'sessions',
          operation: 'list',
          payload: items,
        });

        if (Array.isArray(items)) {
          runtime.output.emit(items, () => runtime.output.tableFromSessions(items));
          return;
        }

        runtime.output.emit(items);
      });
  }

  if (hasEndpoint(runtime, framework, 'sessions', 'get')) {
    sessions
      .command('get <sessionId>')
      .description('Get session details')
      .option('--build <buildId>', 'Build identifier for v2 families')
      .action(async (sessionId, options) => {
        const service = await runtime.getResourceService();
        const pathParams =
          framework === 'appium'
            ? { sessionID: sessionId }
            : framework === 'detox-android'
              ? { sessionID: sessionId }
              : { buildId: options.build, sessionId };

        const response = await service.execute({
          framework,
          resource: 'sessions',
          operation: 'get',
          pathParams,
        });
        await runtime.saveLastResponse({
          command: `${framework} sessions get`,
          framework,
          resource: 'sessions',
          operation: 'get',
          payload: response,
        });
        runtime.output.emit(response);
      });
  }

  if (hasEndpoint(runtime, framework, 'sessions', 'update-status')) {
    sessions
      .command('update-status <sessionId>')
      .description('Update Appium session status')
      .requiredOption('--status <status>', 'passed or failed')
      .option('--reason <reason>', 'Reason for status update')
      .action(async (sessionId, options) => {
        const service = await runtime.getResourceService();
        const response = await service.execute({
          framework,
          resource: 'sessions',
          operation: 'update-status',
          pathParams: { sessionID: sessionId },
          body: {
            status: options.status,
            reason: options.reason,
          },
        });
        runtime.output.emit(response);
      });
  }

  parent.addCommand(sessions);
}

function attachMediaCommands(parent: Command, runtime: CommandRuntime): void {
  parent
    .command('upload <filePath>')
    .description('Upload media files')
    .option('--custom-id <customId>', 'Custom ID')
    .action(async (filePath, options) => {
      const service = await runtime.getResourceService();
      const response = await service.execute({
        framework: 'media',
        resource: 'media',
        operation: 'upload',
        filePath,
        fields: { custom_id: options.customId },
      });
      await runtime.saveLastResponse({
        command: 'media upload',
        framework: 'media',
        resource: 'media',
        operation: 'upload',
        payload: response,
      });
      runtime.output.emit(response);
    });

  parent
    .command('list')
    .description('List uploaded media')
    .option('--custom-id <customId>', 'Custom ID filter')
    .option('--scope <scope>', 'user or group')
    .option('--limit <limit>', 'Page size')
    .action(async (options) => {
      const service = await runtime.getResourceService();
      const operation = options.scope === 'group' ? 'list-group' : 'list';
      const response = await service.execute({
        framework: 'media',
        resource: 'media',
        operation,
        query: { custom_id: options.customId, limit: options.limit },
      });
      await runtime.saveLastResponse({
        command: 'media list',
        framework: 'media',
        resource: 'media',
        operation,
        payload: response,
      });
      runtime.output.emit(response);
    });

  parent
    .command('delete <mediaId>')
    .description('Delete media file')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (mediaId, options) => {
      if (!options.yes) {
        const { confirm } = await import('@inquirer/prompts');
        const accepted = await confirm({
          message: `Delete media file ${mediaId}?`,
          default: false,
        });
        if (!accepted) {
          runtime.output.warning('Delete cancelled.');
          return;
        }
      }

      const service = await runtime.getResourceService();
      const response = await service.execute({
        framework: 'media',
        resource: 'media',
        operation: 'delete',
        pathParams: { media_id: mediaId },
      });
      runtime.output.emit(response);
    });
}

function hasEndpoint(
  runtime: CommandRuntime,
  framework: FrameworkKey,
  resource: ResourceKey,
  operation: 'upload' | 'list' | 'get' | 'delete' | 'run' | 'stop' | 'update-status',
): boolean {
  try {
    runtime.getRegistry().find(framework, resource, operation);
    return true;
  } catch {
    return false;
  }
}

function mapDetailId(
  resource: ResourceKey,
  id: string,
): Record<string, string> {
  switch (resource) {
    case 'apps':
      return { appId: id, appID: id };
    case 'test-suites':
      return { testSuiteId: id };
    case 'test-packages':
      return { testPackageId: id };
    case 'media':
      return { media_id: id };
    default:
      return { id };
  }
}

async function readBodyOptions(data?: string, dataFile?: string): Promise<unknown> {
  if (dataFile) {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(dataFile, 'utf8')) as unknown;
  }

  return parseJsonInput(data, {});
}
