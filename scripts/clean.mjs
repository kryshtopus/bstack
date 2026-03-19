import { rm } from 'node:fs/promises';

const paths = [
  'dist',
  'coverage',
  'vitest.config.js',
  'vitest.config.js.map',
  'vitest.config.d.ts',
];

for (const target of paths) {
  await rm(target, { recursive: true, force: true });
}
