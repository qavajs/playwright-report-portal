import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestCase, TestResult, TestStep, Suite } from '@playwright/test/reporter';

const startLaunch = vi.fn();
const startTestItem = vi.fn();
const finishTestItem = vi.fn();
const finishLaunch = vi.fn();
const sendLog = vi.fn();

function resolved(tempId: string) {
    return { tempId, promise: Promise.resolve({ id: tempId }) };
}

vi.mock('@reportportal/client-javascript', () => ({
    default: vi.fn().mockImplementation(function () {
        return {
            startLaunch,
            startTestItem,
            finishTestItem,
            finishLaunch,
            sendLog
        };
    })
}));

// eslint-disable-next-line import/first
import ReportPortalReporter from '../src/reporter';

function makeSuite(title: string, projectName = 'chromium'): Suite {
    return {
        title,
        project: () => ({ name: projectName }) as any
    } as unknown as Suite;
}

function makeTest(options: {
    id: string;
    name: string;
    uri: string;
    tags?: string[];
    parentTitle?: string;
    priorResults?: TestResult[];
}): TestCase {
    return {
        id: options.id,
        title: options.name,
        tags: options.tags ?? [],
        annotations: [
            { type: 'name', description: options.name },
            { type: 'uri', description: options.uri }
        ],
        parent: makeSuite(options.parentTitle ?? 'My Feature'),
        results: options.priorResults ?? []
    } as unknown as TestCase;
}

function makeStep(options: {
    title: string;
    category?: string;
    error?: { message: string; stack?: string };
    attachments?: TestStep['attachments'];
    annotations?: TestStep['annotations'];
}): TestStep {
    return {
        title: options.title,
        category: options.category ?? 'test.step',
        duration: 1,
        error: options.error,
        attachments: options.attachments ?? [],
        annotations: options.annotations ?? [],
        steps: []
    } as unknown as TestStep;
}

beforeEach(() => {
    vi.clearAllMocks();
    let counter = 0;
    startLaunch.mockImplementation(() => resolved('launch-1'));
    startTestItem.mockImplementation(() => resolved(`item-${++counter}`));
    finishTestItem.mockImplementation(() => resolved('finish'));
    finishLaunch.mockImplementation(() => resolved('launch-finish'));
    sendLog.mockImplementation(() => resolved('log'));
});

function createReporter() {
    return new ReportPortalReporter({ endpoint: 'https://rp.example.com', apiKey: 'key', project: 'proj' });
}

describe('ReportPortalReporter', () => {
    it('starts a launch, a suite and a test item for a passing cucumber scenario', async () => {
        const reporter = createReporter();
        reporter.onBegin();
        const test = makeTest({ id: 't1', name: 'Scenario: do a thing', uri: 'features/a.feature', tags: ['@smoke', '@owner:alex'] });

        reporter.onTestBegin(test);

        expect(startLaunch).toHaveBeenCalledTimes(1);
        expect(startTestItem).toHaveBeenCalledTimes(2); // suite + test
        expect(startTestItem.mock.calls[0][0]).toMatchObject({ name: 'My Feature', type: 'SUITE' });
        expect(startTestItem.mock.calls[1][0]).toMatchObject({
            name: 'Scenario: do a thing',
            type: 'STEP',
            hasStats: true,
            attributes: [{ value: 'smoke' }, { key: 'owner', value: 'alex' }]
        });

        const step = makeStep({ title: 'I do a thing' });
        reporter.onStepBegin(test, {} as TestResult, step);
        expect(startTestItem).toHaveBeenCalledTimes(3);
        expect(startTestItem.mock.calls[2][0]).toMatchObject({ name: 'I do a thing', type: 'STEP' });

        reporter.onStepEnd(test, {} as TestResult, step);
        expect(finishTestItem).toHaveBeenCalledTimes(1);
        expect(finishTestItem.mock.calls[0][1]).toMatchObject({ status: 'passed' });

        reporter.onTestEnd(test, { status: 'passed', steps: [step] } as unknown as TestResult);
        expect(finishTestItem).toHaveBeenCalledTimes(2);
        expect(finishTestItem.mock.calls[1][1]).toMatchObject({ status: 'passed' });

        await reporter.onEnd();
        expect(finishTestItem).toHaveBeenCalledTimes(3); // + suite
        expect(finishLaunch).toHaveBeenCalledTimes(1);
    });

    it('reports a failed step with an error log and fails the parent items', async () => {
        const reporter = createReporter();
        reporter.onBegin();
        const test = makeTest({ id: 't2', name: 'Scenario: fails', uri: 'features/b.feature' });
        reporter.onTestBegin(test);

        const step = makeStep({ title: 'I fail', error: { message: 'boom', stack: 'Error: boom\n at x' } });
        reporter.onStepBegin(test, {} as TestResult, step);
        reporter.onStepEnd(test, {} as TestResult, step);

        expect(sendLog).toHaveBeenCalledTimes(1);
        expect(sendLog.mock.calls[0][1]).toMatchObject({ level: 'ERROR', message: 'Error: boom\n at x' });
        expect(finishTestItem.mock.calls[0][1]).toMatchObject({ status: 'failed' });

        reporter.onTestEnd(test, { status: 'failed', steps: [step], error: { message: 'boom' } } as unknown as TestResult);
        expect(finishTestItem.mock.calls[1][1]).toMatchObject({ status: 'failed' });
        // error already reported on the step, so onTestEnd must not send a duplicate scenario-level log
        expect(sendLog).toHaveBeenCalledTimes(1);

        await reporter.onEnd();
    });

    it('sends this.log attachments as plain text logs and others as files', async () => {
        const reporter = createReporter();
        reporter.onBegin();
        const test = makeTest({ id: 't3', name: 'Scenario: attaches', uri: 'features/c.feature' });
        reporter.onTestBegin(test);

        const step = makeStep({
            title: 'I attach things',
            attachments: [
                { name: 'log', contentType: 'text/plain', body: Buffer.from('hello world') },
                { name: 'screenshot.png', contentType: 'image/png', body: Buffer.from('binary') }
            ] as TestStep['attachments']
        });
        reporter.onStepBegin(test, {} as TestResult, step);
        reporter.onStepEnd(test, {} as TestResult, step);

        expect(sendLog).toHaveBeenCalledTimes(2);
        expect(sendLog.mock.calls[0][1]).toMatchObject({ level: 'INFO', message: 'hello world' });
        expect(sendLog.mock.calls[0][2]).toBeUndefined();
        expect(sendLog.mock.calls[1][1]).toMatchObject({ level: 'INFO', message: 'screenshot.png' });
        expect(sendLog.mock.calls[1][2]).toMatchObject({ name: 'screenshot.png', type: 'image/png' });

        await reporter.onEnd();
    });

    it('ignores non-cucumber tests entirely', () => {
        const reporter = createReporter();
        reporter.onBegin();
        const test = {
            id: 'plain',
            title: 'a plain playwright test',
            tags: [],
            annotations: [],
            parent: makeSuite('some file'),
            results: []
        } as unknown as TestCase;

        reporter.onTestBegin(test);
        expect(startTestItem).not.toHaveBeenCalled();

        const step = makeStep({ title: 'step' });
        reporter.onStepBegin(test, {} as TestResult, step);
        reporter.onStepEnd(test, {} as TestResult, step);
        reporter.onTestEnd(test, { status: 'passed', steps: [] } as unknown as TestResult);

        expect(startTestItem).not.toHaveBeenCalled();
        expect(finishTestItem).not.toHaveBeenCalled();
    });

    it('marks a retried scenario attempt with retry: true', () => {
        const reporter = createReporter();
        reporter.onBegin();
        const test = makeTest({
            id: 't4',
            name: 'Scenario: flaky',
            uri: 'features/d.feature',
            priorResults: [{ status: 'failed' } as TestResult]
        });

        reporter.onTestBegin(test);

        expect(startTestItem.mock.calls[1][0]).toMatchObject({ retry: true });
    });
});
