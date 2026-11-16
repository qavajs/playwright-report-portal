import { readFileSync } from 'node:fs';
import type { TestStep } from '@playwright/test/reporter';
import type { Attachment } from '@reportportal/client-javascript/models';

// matches ANSI escape codes in error messages/stacks
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;

export function errorText(error?: { stack?: string; message?: string }): string | undefined {
    return (error?.stack ?? error?.message)?.replace(ANSI, '');
}

export interface ResolvedAttachment {
    message: string;
    file?: Attachment;
}

function collectAttachments(step: TestStep, result: ResolvedAttachment[]): void {
    for (const attachment of step.attachments) {
        let body = attachment.body;
        if (!body && attachment.path) {
            try {
                body = readFileSync(attachment.path);
            } catch {
                continue;
            }
        }
        if (!body) continue;
        const isLog = attachment.name === 'log' && attachment.contentType === 'text/plain';
        if (isLog) {
            result.push({ message: body.toString('utf-8') });
        } else {
            result.push({
                message: attachment.name,
                file: { name: attachment.name, type: attachment.contentType, content: body }
            });
        }
    }
    // `this.attach()`/`this.log()` are reported by Playwright as a nested `test.attach` step
    // (not on the `test.step()`'s own `attachments`), so descend into any non-`test.step`
    // children - `test.step` children are reported by their own `onStepEnd` instead.
    for (const child of step.steps) {
        if (child.category !== 'test.step') collectAttachments(child, result);
    }
}

/**
 * Resolve a `test.step()`'s own attachments and those of its nested `test.attach` steps
 * (not its `test.step` children's - they are reported by their own `onStepEnd`) into
 * ReportPortal log payloads. `this.log()` attachments (named `log`, `text/plain`) become
 * plain text logs; everything else becomes a log with a file attached.
 */
export function resolveStepAttachments(step: TestStep): ResolvedAttachment[] {
    const result: ResolvedAttachment[] = [];
    collectAttachments(step, result);
    return result;
}
