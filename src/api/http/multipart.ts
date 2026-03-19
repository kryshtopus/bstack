import { createReadStream } from 'node:fs';

import FormData from 'form-data';
import mime from 'mime-types';

import { assertReadableFile } from '../../utils/files.js';

export interface MultipartInput {
  filePath?: string;
  fileFieldName?: string;
  fileName?: string;
  url?: string;
  urlFieldName?: string;
  fields?: Record<string, string | number | boolean | undefined>;
}

export async function buildMultipartPayload(
  input: MultipartInput,
): Promise<{ form: FormData; headers: Record<string, string> }> {
  const form = new FormData();

  if (input.filePath) {
    await assertReadableFile(input.filePath);
    form.append(input.fileFieldName ?? 'file', createReadStream(input.filePath), {
      contentType: mime.lookup(input.filePath) || 'application/octet-stream',
      filename: input.fileName,
    });
  }

  if (input.url) {
    form.append(input.urlFieldName ?? 'url', input.url);
  }

  for (const [key, value] of Object.entries(input.fields ?? {})) {
    if (value === undefined) {
      continue;
    }
    form.append(key, String(value));
  }

  return {
    form,
    headers: form.getHeaders() as Record<string, string>,
  };
}
