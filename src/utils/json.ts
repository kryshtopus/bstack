export function parseJsonInput<T>(value: string | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
