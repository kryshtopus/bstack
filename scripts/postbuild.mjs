import { chmod } from 'node:fs/promises';

await chmod('dist/bin.js', 0o755);
