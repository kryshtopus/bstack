import { Command } from 'commander';

import { promptForLogin } from '../prompts/authPrompts.js';

import type { CommandRuntime } from '../cli/context.js';

export function createAuthCommands(runtime: CommandRuntime): Command {
  const auth = new Command('auth').description('Authentication and session management');

  auth
    .command('login')
    .description('Login with BrowserStack username and access key')
    .option('-u, --username <username>', 'BrowserStack username')
    .option('-k, --access-key <accessKey>', 'BrowserStack access key')
    .option(
      '--storage <strategy>',
      'Storage strategy: auto, keychain, encrypted-file, plain-file',
      'auto',
    )
    .option('--master-key <masterKey>', 'Master key for encrypted-file storage')
    .option('--allow-plain-storage', 'Allow plain-text session storage')
    .action(async (options) => {
      const prompted = !options.username || !options.accessKey ? await promptForLogin() : undefined;
      const spinner = runtime.spinner('Validating BrowserStack credentials');

      try {
        const status = await runtime.auth.login({
          username: options.username ?? prompted?.username,
          accessKey: options.accessKey ?? prompted?.accessKey,
          storageStrategy: options.storage ?? prompted?.storageStrategy ?? 'auto',
          masterKey: options.masterKey ?? runtime.options.masterKey ?? prompted?.masterKey,
          allowPlainText:
            Boolean(options.allowPlainStorage) ||
            runtime.options.allowPlainStorage === true ||
            prompted?.allowPlainText === true,
        });
        spinner.succeed('Credentials validated and saved');
        runtime.output.emit(status);
      } catch (error) {
        spinner.fail(error instanceof Error ? error.message : String(error));
        throw error;
      }
    });

  auth
    .command('logout')
    .description('Clear the saved BrowserStack session')
    .action(async () => {
      await runtime.auth.logout();
      runtime.output.success('Saved session removed.');
    });

  auth
    .command('status')
    .description('Show saved session status')
    .action(async () => {
      const status = await runtime.auth.status();
      runtime.output.emit(status);
    });

  auth
    .command('validate')
    .description('Validate the saved credentials against BrowserStack')
    .action(async () => {
      const session = await runtime.requireSession();
      const status = await runtime.auth.validate(session);
      await runtime.saveLastResponse({
        command: 'auth validate',
        framework: 'auth',
        resource: 'auth',
        operation: 'validate',
        payload: status,
      });
      runtime.output.emit(status);
    });

  auth
    .command('whoami')
    .description('Alias for auth validate')
    .action(async () => {
      const session = await runtime.requireSession();
      const status = await runtime.auth.validate(session);
      runtime.output.emit(status);
    });

  return auth;
}
