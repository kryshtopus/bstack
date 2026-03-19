import type { Method } from 'axios';

import type { FrameworkKey, OperationKey, ResourceKey } from '../../types/domain.js';

export interface EndpointDefinition {
  id: string;
  framework: FrameworkKey;
  resource: ResourceKey;
  operation: OperationKey;
  label: string;
  method: Method;
  pathTemplate: string;
  description: string;
  requestKind: 'json' | 'multipart';
  pathParams?: string[];
  queryParams?: string[];
  upload?: {
    fileFieldName?: string;
    urlFieldName?: string;
  };
}

export interface ResolvedEndpoint {
  definition: EndpointDefinition;
  path: string;
}
