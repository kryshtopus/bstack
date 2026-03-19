import type { BuildSummary, SessionSummary, UploadedArtifact } from '../../types/domain.js';

export function normalizeArtifact(input: unknown): UploadedArtifact {
  const record = asRecord(input);
  const nested = maybeNestedArtifact(record);

  return {
    id:
      asString(nested.app_id) ??
      asString(nested.test_suite_id) ??
      asString(nested.test_package_id) ??
      asString(nested.media_id),
    url:
      asString(nested.app_url) ??
      asString(nested.test_suite_url) ??
      asString(nested.test_package_url) ??
      asString(nested.media_url),
    name:
      asString(nested.app_name) ??
      asString(nested.test_suite_name) ??
      asString(nested.test_package_name) ??
      asString(nested.media_name),
    version: asString(nested.app_version),
    uploadedAt: asString(nested.uploaded_at),
    expiry: asString(nested.expiry),
    customId: asString(nested.custom_id),
    shareableId: asString(nested.shareable_id),
    framework: asString(nested.framework),
    raw: input,
  };
}

export function normalizeBuildSummary(input: unknown): BuildSummary {
  const record = asRecord(input);
  const nested = (asRecord(record.automation_build) || record) as Record<string, unknown>;

  return {
    id: asString(nested.hashed_id) ?? asString(nested.id) ?? 'unknown-build',
    name: asString(nested.name),
    project: asString(nested.project_name) ?? asString(nested.project),
    status: asString(nested.status),
    duration: asNumber(nested.duration) ?? asString(nested.duration),
    startTime: asString(nested.start_time) ?? asString(nested.created_at),
    browserUrl: asString(nested.browser_url) ?? asString(nested.public_url),
    raw: input,
  };
}

export function normalizeSessionSummary(input: unknown): SessionSummary {
  const record = asRecord(input);
  const nested = (asRecord(record.automation_session) || record) as Record<string, unknown>;

  return {
    id: asString(nested.hashed_id) ?? asString(nested.id) ?? 'unknown-session',
    name: asString(nested.name),
    status: asString(nested.status),
    device: asString(nested.device),
    os: asString(nested.os),
    osVersion: asString(nested.os_version),
    browserUrl: asString(nested.browser_url) ?? asString(nested.logs),
    publicUrl: asString(nested.public_url),
    buildId: asString(nested.build_hashed_id) ?? asString(nested.build_id),
    buildName: asString(nested.build_name),
    raw: input,
  };
}

export function normalizeArtifactCollection(input: unknown): UploadedArtifact[] {
  if (Array.isArray(input)) {
    return input.map(normalizeArtifact);
  }

  const record = asRecord(input);
  for (const key of ['apps', 'test_suites', 'test_packages', 'media_files']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map(normalizeArtifact);
    }
  }

  if (record.app || record.test_suite || record.test_package) {
    return [normalizeArtifact(record.app ?? record.test_suite ?? record.test_package)];
  }

  return [];
}

export function normalizeBuildCollection(input: unknown): BuildSummary[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map(normalizeBuildSummary);
}

export function normalizeSessionCollection(input: unknown): SessionSummary[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map(normalizeSessionSummary);
}

function maybeNestedArtifact(record: Record<string, unknown>): Record<string, unknown> {
  return (
    asOptionalRecord(record.app) ??
    asOptionalRecord(record.test_suite) ??
    asOptionalRecord(record.test_package) ??
    asOptionalRecord(record.media_file) ??
    record
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}
