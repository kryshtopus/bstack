import Table from 'cli-table3';
import pc from 'picocolors';

import type {
  BuildSummary,
  ConnectionState,
  SessionSummary,
  UploadedArtifact,
} from '../types/domain.js';
import { prettyJson } from '../utils/json.js';

export interface OutputOptions {
  json?: boolean;
}

export class Output {
  public constructor(private readonly options: OutputOptions = {}) {}

  public info(message: string): void {
    process.stdout.write(`${pc.cyan(message)}\n`);
  }

  public success(message: string): void {
    process.stdout.write(`${pc.green(message)}\n`);
  }

  public warning(message: string): void {
    process.stderr.write(`${pc.yellow(message)}\n`);
  }

  public error(message: string): void {
    process.stderr.write(`${pc.red(message)}\n`);
  }

  public print(value: unknown): void {
    process.stdout.write(`${prettyJson(value)}\n`);
  }

  public clear(): void {
    process.stdout.write('\x1Bc');
  }

  public title(title: string, subtitle?: string): void {
    process.stdout.write(`${pc.bold(title)}\n`);
    if (subtitle) {
      process.stdout.write(`${pc.dim(subtitle)}\n`);
    }
    process.stdout.write('\n');
  }

  public section(title: string): void {
    process.stdout.write(`${pc.bold(title)}\n`);
  }

  public lines(lines: string[]): void {
    for (const line of lines) {
      process.stdout.write(`${line}\n`);
    }
  }

  public kv(label: string, value: string, options?: { dim?: boolean }): void {
    const formatted = `${pc.bold(label)} ${value}`;
    process.stdout.write(`${options?.dim ? pc.dim(formatted) : formatted}\n`);
  }

  public divider(): void {
    process.stdout.write(`${pc.dim('─'.repeat(Math.max(32, Math.min(process.stdout.columns || 80, 72))))}\n`);
  }

  public footerHints(hints: string[]): void {
    process.stdout.write(`\n${pc.dim(hints.join('   '))}\n`);
  }

  public badge(label: string, state: ConnectionState | 'info' | 'warning'): string {
    const normalized = ` ${label} `;
    switch (state) {
      case 'connected':
        return pc.bgGreen(pc.black(normalized));
      case 'invalid':
        return pc.bgRed(pc.white(normalized));
      case 'saved-unvalidated':
      case 'warning':
        return pc.bgYellow(pc.black(normalized));
      case 'disconnected':
        return pc.bgBlack(pc.white(normalized));
      default:
        return pc.bgBlue(pc.white(normalized));
    }
  }

  public emptyState(title: string, message: string, cta?: string): void {
    process.stdout.write(`${pc.bold(title)}\n${pc.dim(message)}\n`);
    if (cta) {
      process.stdout.write(`${pc.cyan(cta)}\n`);
    }
  }

  public banner(title: string, body: string, tone: 'info' | 'warning' | 'error' | 'success'): void {
    const color =
      tone === 'success'
        ? pc.green
        : tone === 'warning'
          ? pc.yellow
          : tone === 'error'
            ? pc.red
            : pc.cyan;
    process.stdout.write(`${color(pc.bold(title))}\n${body}\n\n`);
  }

  public emit(value: unknown, renderer?: () => string): void {
    if (this.options.json || !renderer) {
      this.print(value);
      return;
    }

    process.stdout.write(`${renderer()}\n`);
  }

  public tableFromArtifacts(items: UploadedArtifact[]): string {
    const table = new Table({
      head: ['ID', 'Name', 'URL', 'Custom ID', 'Uploaded At', 'Expiry'],
      wordWrap: true,
    });

    for (const item of items) {
      table.push([
        item.id ?? '',
        item.name ?? '',
        item.url ?? '',
        item.customId ?? '',
        item.uploadedAt ?? '',
        item.expiry ?? '',
      ]);
    }

    return items.length > 0 ? table.toString() : 'No resources found.';
  }

  public tableFromBuilds(items: BuildSummary[]): string {
    const table = new Table({
      head: ['ID', 'Name', 'Project', 'Status', 'Duration', 'Start Time'],
      wordWrap: true,
    });

    for (const item of items) {
      table.push([
        item.id,
        item.name ?? '',
        item.project ?? '',
        item.status ?? '',
        item.duration ?? '',
        item.startTime ?? '',
      ]);
    }

    return items.length > 0 ? table.toString() : 'No builds found.';
  }

  public tableFromSessions(items: SessionSummary[]): string {
    const table = new Table({
      head: ['ID', 'Name', 'Status', 'Device', 'OS', 'Build'],
      wordWrap: true,
    });

    for (const item of items) {
      table.push([
        item.id,
        item.name ?? '',
        item.status ?? '',
        item.device ?? '',
        [item.os, item.osVersion].filter(Boolean).join(' '),
        item.buildName ?? item.buildId ?? '',
      ]);
    }

    return items.length > 0 ? table.toString() : 'No sessions found.';
  }
}
