import { access, constants, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true, mode: 0o700 });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function assertReadableFile(filePath: string): Promise<void> {
  await access(filePath, constants.R_OK);
  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) {
    throw new Error(`Path is not a regular file: ${filePath}`);
  }
}

export function expandHome(inputPath: string): string {
  if (!inputPath.startsWith('~/')) {
    return inputPath;
  }

  return path.join(process.env.HOME ?? '', inputPath.slice(2));
}
