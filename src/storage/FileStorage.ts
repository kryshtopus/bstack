import { chmod, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, fileExists } from '../utils/files.js';

export async function writePrivateFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
  await chmod(filePath, 0o600);
}

export async function readTextFile(filePath: string): Promise<string | null> {
  if (!(await fileExists(filePath))) {
    return null;
  }

  return readFile(filePath, 'utf8');
}

export async function deleteFileIfExists(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}
