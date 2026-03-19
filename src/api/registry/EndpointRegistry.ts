import type { FrameworkKey, OperationKey, ResourceKey } from '../../types/domain.js';

import type { EndpointDefinition, ResolvedEndpoint } from './types.js';

export class EndpointRegistry {
  public constructor(private readonly definitions: EndpointDefinition[]) {}

  public list(): EndpointDefinition[] {
    return [...this.definitions];
  }

  public listByFramework(framework: FrameworkKey): EndpointDefinition[] {
    return this.definitions.filter((definition) => definition.framework === framework);
  }

  public find(
    framework: FrameworkKey,
    resource: ResourceKey,
    operation: OperationKey,
  ): EndpointDefinition {
    const found = this.definitions.find(
      (definition) =>
        definition.framework === framework &&
        definition.resource === resource &&
        definition.operation === operation,
    );

    if (!found) {
      throw new Error(`Unsupported operation: ${framework} ${resource} ${operation}`);
    }

    return found;
  }

  public resolve(
    framework: FrameworkKey,
    resource: ResourceKey,
    operation: OperationKey,
    params: Record<string, string | number | undefined>,
  ): ResolvedEndpoint {
    const definition = this.find(framework, resource, operation);
    let path = definition.pathTemplate;

    for (const pathParam of definition.pathParams ?? []) {
      const value = params[pathParam];
      if (!value) {
        throw new Error(`Missing required path parameter: ${pathParam}`);
      }

      path = path.replaceAll(`{${pathParam}}`, encodeURIComponent(String(value)));
    }

    return { definition, path };
  }
}
