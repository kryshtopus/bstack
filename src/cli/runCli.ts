import { asError } from '../utils/errors.js';

import { CommandRuntime } from './context.js';
import { createProgram } from './program.js';

export async function runCli(argv = process.argv): Promise<void> {
  const { config } = await import('dotenv');
  config({ quiet: true });

  const runtime = new CommandRuntime({
    json: argv.includes('--json'),
    debugHttp: argv.includes('--debug-http'),
    verbose: argv.includes('--verbose'),
    allowPlainStorage: argv.includes('--allow-plain-storage'),
    masterKey: getOptionValue(argv, '--master-key'),
    baseUrl: getOptionValue(argv, '--base-url'),
  });

  const program = createProgram(runtime);

  try {
    await program.parseAsync(argv);
  } catch (error) {
    runtime.output.error(asError(error).message);
    process.exitCode = 1;
  }
}

function getOptionValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return argv[index + 1];
}
