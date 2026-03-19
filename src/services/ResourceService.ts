import { normalizeArtifactCollection, normalizeBuildCollection, normalizeSessionCollection } from '../api/normalizers/common.js';
import type { EndpointRegistry } from '../api/registry/EndpointRegistry.js';
import type { EndpointDefinition } from '../api/registry/types.js';
import type {
  FrameworkKey,
  BuildSummary,
  OperationKey,
  ResourceKey,
  SessionSummary,
  UploadedArtifact,
} from '../types/domain.js';
import type { BrowserStackHttpClient } from '../api/http/BrowserStackHttpClient.js';
import { assertReadableFile } from '../utils/files.js';

export interface ExecuteOperationInput {
  framework: FrameworkKey;
  resource: ResourceKey;
  operation: OperationKey;
  pathParams?: Record<string, string | number | undefined>;
  query?: Record<string, unknown>;
  body?: unknown;
  filePath?: string;
  url?: string;
  fields?: Record<string, unknown>;
}

export class ResourceService {
  public constructor(
    private readonly registry: EndpointRegistry,
    private readonly http: BrowserStackHttpClient,
  ) {}

  public getRegistry(): EndpointRegistry {
    return this.registry;
  }

  public async execute(input: ExecuteOperationInput): Promise<unknown> {
    const resolved = this.registry.resolve(
      input.framework,
      input.resource,
      input.operation,
      input.pathParams ?? {},
    );

    return this.executeResolved(resolved.definition, resolved.path, input);
  }

  public async listArtifacts(
    framework: FrameworkKey,
    resource: 'apps' | 'test-suites' | 'test-packages' | 'media',
    query?: Record<string, unknown>,
  ): Promise<UploadedArtifact[]> {
    const response = await this.execute({
      framework,
      resource,
      operation: 'list',
      query,
    });

    return normalizeArtifactCollection(response);
  }

  public async listBuilds(
    framework: FrameworkKey,
    query?: Record<string, unknown>,
  ): Promise<BuildSummary[]> {
    const response = await this.execute({
      framework,
      resource: 'builds',
      operation: 'list',
      query,
    });

    return normalizeBuildCollection(response);
  }

  public async getBuildSessions(
    framework: FrameworkKey,
    buildId: string,
  ): Promise<SessionSummary[]> {
    if (framework === 'appium') {
      const response = await this.execute({
        framework,
        resource: 'sessions',
        operation: 'list',
        pathParams: { buildID: buildId },
      });
      return normalizeSessionCollection(response);
    }

    const response = await this.execute({
      framework,
      resource: 'builds',
      operation: 'get',
      pathParams: { buildId },
    });

    const build = (response ?? {}) as Record<string, unknown>;
    const sessions = Array.isArray(build.sessions)
      ? build.sessions
      : Array.isArray(build.device_sessions)
        ? build.device_sessions
        : [];

    return normalizeSessionCollection(sessions);
  }

  private async executeResolved(
    definition: EndpointDefinition,
    path: string,
    input: ExecuteOperationInput,
  ): Promise<unknown> {
    if (definition.requestKind === 'multipart') {
      if (input.filePath) {
        await assertReadableFile(input.filePath);
      }

      return this.http.uploadMultipart(path, {
        filePath: input.filePath,
        url: input.url,
        fileFieldName: definition.upload?.fileFieldName,
        urlFieldName: definition.upload?.urlFieldName,
        fields: input.fields as Record<string, string | number | boolean | undefined> | undefined,
      });
    }

    return this.http.requestJson({
      method: definition.method,
      path,
      query: input.query,
      data: input.body,
    });
  }
}
