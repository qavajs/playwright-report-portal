import RPClient from '@reportportal/client-javascript';
import { PREDEFINED_LOG_LEVELS, STATUSES, TEST_ITEM_TYPES } from '@reportportal/client-javascript/constants';
import type { ClientResponse } from '@reportportal/client-javascript/models';
import type { Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import { resolveConfig, type ReportPortalAgentConfig, type ResolvedConfig } from './config';
import { tagsToAttributes } from './attributes';
import { errorText, resolveStepAttachments } from './attachments';
import { mapStatus } from './statusMap';

interface ScenarioState {
    tempId: string;
}

/**
 * Playwright reporter that translates the Feature -> Scenario -> Step tree produced by
 * `@qavajs/playwright-runner-adapter` into ReportPortal's Launch -> Suite -> Test -> Step
 * hierarchy, in real time. Tests that are not cucumber scenarios (no `uri`/`name`
 * annotations, same detection `@qavajs/playwright-runner-adapter/reporter` uses) are ignored.
 *
 * @example
 * // playwright.config.ts
 * export default defineConfig({
 *     reporter: [['@qavajs/playwright-report-portal', { endpoint, apiKey, project }]]
 * });
 */
export default class ReportPortalReporter implements Reporter {
    private readonly config: ResolvedConfig;
    private client!: RPClient;
    private launchTempId = '';
    private readonly promises: Promise<unknown>[] = [];
    private readonly suites = new Map<string, string>();
    private readonly scenarios = new Map<string, ScenarioState>();
    private readonly stepStack = new Map<string, string[]>();

    constructor(options: ReportPortalAgentConfig = {}) {
        this.config = resolveConfig(options);
    }

    private queue(promise: Promise<unknown>): void {
        this.promises.push(
            promise.catch(err => {
                console.error(`@qavajs/playwright-report-portal: ${err?.message ?? err}`);
            })
        );
    }

    private start(response: ClientResponse): string {
        this.queue(response.promise);
        return response.tempId;
    }

    onBegin(): void {
        this.client = new RPClient({
            endpoint: this.config.endpoint,
            apiKey: this.config.apiKey,
            project: this.config.project,
            debug: this.config.debug,
            skippedIsNotIssue: this.config.skippedIsNotIssue,
            restClientConfig: this.config.restClientConfig
        });
        this.launchTempId = this.start(
            this.client.startLaunch({
                name: this.config.launch,
                description: this.config.description,
                attributes: this.config.attributes,
                mode: this.config.mode,
                rerun: this.config.rerun,
                rerunOf: this.config.rerunOf
            })
        );
    }

    private annotation(test: TestCase, type: string): string | undefined {
        return test.annotations.find(a => a.type === type)?.description;
    }

    private isCucumberScenario(test: TestCase): boolean {
        return this.annotation(test, 'uri') !== undefined && this.annotation(test, 'name') !== undefined;
    }

    private ensureSuite(test: TestCase): string {
        const project = test.parent.project()?.name ?? '';
        const featureTitle = test.parent.title;
        const key = `${project}::${featureTitle}`;
        const existing = this.suites.get(key);
        if (existing) return existing;
        const tempId = this.start(
            this.client.startTestItem(
                { name: featureTitle || '(feature)', type: TEST_ITEM_TYPES.SUITE },
                this.launchTempId
            )
        );
        this.suites.set(key, tempId);
        return tempId;
    }

    onTestBegin(test: TestCase): void {
        if (!this.isCucumberScenario(test)) return;
        const suiteTempId = this.ensureSuite(test);
        const uri = this.annotation(test, 'uri');
        const name = this.annotation(test, 'name') ?? test.title;
        const isRetry = test.results.length > 0;
        const tempId = this.start(
            this.client.startTestItem(
                {
                    name,
                    type: TEST_ITEM_TYPES.STEP,
                    hasStats: true,
                    description: uri,
                    // must be unique per scenario, not just per feature file: ReportPortal derives
                    // testCaseId from codeRef (when not retried) and groups "History" by testCaseId,
                    // so reusing the feature's uri here would make every scenario in the same
                    // feature look like retries/history of a single test.
                    codeRef: `${uri}:${name}`,
                    attributes: tagsToAttributes(test.tags),
                    ...(isRetry ? { retry: true } : {})
                },
                this.launchTempId,
                suiteTempId
            )
        );
        this.scenarios.set(test.id, { tempId });
        this.stepStack.set(test.id, []);
    }

    private activeParent(test: TestCase): string | undefined {
        const stack = this.stepStack.get(test.id);
        if (stack && stack.length > 0) return stack[stack.length - 1];
        return this.scenarios.get(test.id)?.tempId;
    }

    onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
        if (!this.isCucumberScenario(test) || step.category !== 'test.step') return;
        const parentTempId = this.activeParent(test);
        if (!parentTempId) return;
        const tempId = this.start(
            this.client.startTestItem(
                { name: step.title, type: TEST_ITEM_TYPES.STEP, hasStats: false },
                this.launchTempId,
                parentTempId
            )
        );
        this.stepStack.get(test.id)?.push(tempId);
    }

    onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
        if (!this.isCucumberScenario(test) || step.category !== 'test.step') return;
        const tempId = this.stepStack.get(test.id)?.pop();
        if (!tempId) return;

        for (const attachment of resolveStepAttachments(step)) {
            this.queue(
                this.client.sendLog(
                    tempId,
                    { level: step.error ? PREDEFINED_LOG_LEVELS.ERROR : PREDEFINED_LOG_LEVELS.INFO, message: attachment.message },
                    attachment.file
                ).promise
            );
        }

        const skipped = step.annotations.some(a => a.type === 'skip');
        let status: STATUSES = STATUSES.PASSED;
        if (skipped) {
            status = STATUSES.SKIPPED;
        } else if (step.error) {
            status = STATUSES.FAILED;
            const message = errorText(step.error);
            if (message) {
                this.queue(this.client.sendLog(tempId, { level: PREDEFINED_LOG_LEVELS.ERROR, message }).promise);
            }
        }
        this.queue(this.client.finishTestItem(tempId, { status }).promise);
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        if (!this.isCucumberScenario(test)) return;
        const scenario = this.scenarios.get(test.id);
        this.stepStack.delete(test.id);
        if (!scenario) return;

        // a failure outside of any reported step (e.g. in a fixture or world `init`)
        if (result.error && !result.steps.some(step => !!step.error)) {
            const message = errorText(result.error);
            if (message) {
                this.queue(this.client.sendLog(scenario.tempId, { level: PREDEFINED_LOG_LEVELS.ERROR, message }).promise);
            }
        }
        this.queue(this.client.finishTestItem(scenario.tempId, { status: mapStatus(result.status) }).promise);
    }

    async onEnd(): Promise<void> {
        for (const suiteTempId of this.suites.values()) {
            this.queue(this.client.finishTestItem(suiteTempId, {}).promise);
        }
        await Promise.allSettled(this.promises);
        const { promise } = this.client.finishLaunch(this.launchTempId, {});
        await promise.catch(() => {});
    }

    printsToStdio(): boolean {
        return false;
    }
}
