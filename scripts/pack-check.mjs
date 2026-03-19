import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const cwd = process.cwd();
const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));

const packJson = execFileSync('npm', ['pack', '--json'], {
  cwd,
  encoding: 'utf8',
});

const [packResult] = JSON.parse(packJson);
if (!packResult?.filename) {
  throw new Error('npm pack did not return a tarball filename.');
}

const tarballPath = path.join(cwd, packResult.filename);
const packagedFiles = packResult.files.map((file) => file.path);
const forbiddenPatterns = [
  /^src\//,
  /^coverage\//,
  /^node_modules\//,
  /^dist\/tests\//,
  /^\.env/,
  /^vitest\.config\.(js|d\.ts|js\.map)$/,
];

for (const filePath of packagedFiles) {
  if (forbiddenPatterns.some((pattern) => pattern.test(filePath))) {
    throw new Error(`Forbidden file included in tarball: ${filePath}`);
  }
}

const localPrefix = await mkdtemp(path.join(os.tmpdir(), 'bstack-local-install-'));
const globalPrefix = await mkdtemp(path.join(os.tmpdir(), 'bstack-global-install-'));

try {
  await writeFile(
    path.join(localPrefix, 'package.json'),
    JSON.stringify({ name: 'bstack-local-install-check', private: true }, null, 2),
  );

  execFileSync('npm', ['install', tarballPath], {
    cwd: localPrefix,
    stdio: 'inherit',
  });

  execFileSync(
    'node',
    [
      '--input-type=module',
      '-e',
      `import * as pkg from '${pkg.name}'; if (!pkg.EndpointRegistry || !pkg.createProgram) { throw new Error('Missing expected public exports'); }`,
    ],
    {
      cwd: localPrefix,
      stdio: 'inherit',
    },
  );

  execFileSync('npm', ['install', '-g', '--prefix', globalPrefix, tarballPath], {
    cwd,
    stdio: 'inherit',
  });

  const binPath = path.join(globalPrefix, 'bin', 'bstack');
  execFileSync(binPath, ['--help'], {
    cwd,
    stdio: 'inherit',
  });

  process.stdout.write(
    `Tarball validated: ${packResult.filename}\nIncluded files: ${packagedFiles.length}\n`,
  );
} finally {
  await rm(localPrefix, { recursive: true, force: true });
  await rm(globalPrefix, { recursive: true, force: true });
}
