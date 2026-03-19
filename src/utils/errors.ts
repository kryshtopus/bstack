export function asError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
