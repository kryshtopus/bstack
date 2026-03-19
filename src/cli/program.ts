import { Command } from 'commander';

import { APP_NAME } from '../utils/constants.js';

import type { CommandRuntime, GlobalCliOptions } from './context.js';
import { createAuthCommands } from '../commands/auth.js';
import { createExplorerCommand } from '../commands/explorer.js';
import { createFrameworkCommands } from '../commands/framework.js';
import { runInteractiveMenu } from '../menus/interactiveMenu.js';

export function createProgram(runtime: CommandRuntime): Command {
  const program = new Command();

  program
    .name('bstack')
    .description('BrowserStack App Automate CLI utility')
    .version('1.0.0')
    .option('--json', 'Emit machine-readable JSON')
    .option('--debug-http', 'Enable HTTP request debug logging')
    .option('--verbose', 'Verbose output')
    .option('--allow-plain-storage', 'Allow plain-text credential storage')
    .option('--master-key <masterKey>', 'Master key for encrypted-file storage')
    .option('--base-url <baseUrl>', 'Override BrowserStack API base URL');

  program.addCommand(createAuthCommands(runtime));
  for (const command of createFrameworkCommands(runtime)) {
    program.addCommand(command);
  }
  program.addCommand(createExplorerCommand(runtime));

  program
    .command('menu')
    .description('Open the interactive menu')
    .action(async () => {
      await runInteractiveMenu(runtime);
    });

  program
    .command('export-last <filePath>')
    .description('Export the last response payload to a file')
    .option('-f, --force', 'Overwrite existing files')
    .action(async (filePath, options) => {
      await runtime.exportLastResponse(filePath, options.force === true);
      runtime.output.success(`Exported last response to ${filePath}`);
    });

  program
    .command('help-frameworks')
    .description('Show documented framework support summary')
    .action(() => {
      runtime.output.info(
        `${APP_NAME} supports Appium, Maestro, Espresso, Flutter Android, Flutter iOS, Detox Android, XCUITest, and Media APIs through a shared endpoint registry.`,
      );
    });

  program.action(async () => {
    await runInteractiveMenu(runtime);
  });

  return program;
}

export function optionsFromProgram(program: Command): GlobalCliOptions {
  const options = program.opts();
  return {
    json: Boolean(options.json),
    debugHttp: Boolean(options.debugHttp),
    verbose: Boolean(options.verbose),
    allowPlainStorage: Boolean(options.allowPlainStorage),
    masterKey: options.masterKey as string | undefined,
    baseUrl: options.baseUrl as string | undefined,
  };
}
