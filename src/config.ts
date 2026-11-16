import type { Attribute } from '@reportportal/client-javascript/models';
import type { LAUNCH_MODES } from '@reportportal/client-javascript/constants';
import type { RestClientConfig } from '@reportportal/client-javascript/models';

/**
 * Options accepted by the `@qavajs/playwright-report-portal` reporter.
 * Field names mirror `@reportportal/client-javascript`'s `ReportPortalConfig`
 * so the config feels native to existing ReportPortal users.
 */
export interface ReportPortalAgentConfig {
    /** ReportPortal server URL, e.g. `https://reportportal.example.com/api/v1`. Falls back to `RP_ENDPOINT`. */
    endpoint?: string;
    /** ReportPortal API key. Falls back to `RP_API_KEY`. */
    apiKey?: string;
    /** ReportPortal project name. Falls back to `RP_PROJECT`. */
    project?: string;
    /** Launch name. Falls back to `RP_LAUNCH`, then `'Playwright BDD'`. */
    launch?: string;
    /** Launch description. */
    description?: string;
    /** Launch level attributes. */
    attributes?: Attribute[];
    /** `'DEFAULT'` or `'DEBUG'`. */
    mode?: LAUNCH_MODES;
    /** Enables the ReportPortal client's own HTTP debug logging. */
    debug?: boolean;
    /** When `true`, skipped scenarios are not treated as a "to investigate" issue. */
    skippedIsNotIssue?: boolean;
    /** Marks the launch as a rerun. */
    rerun?: boolean;
    /** uuid of the launch this one reruns. */
    rerunOf?: string;
    /** Passed through to the ReportPortal client's REST client (proxy, headers, retry, ...). */
    restClientConfig?: RestClientConfig;
}

export interface ResolvedConfig {
    endpoint: string;
    apiKey: string;
    project: string;
    launch: string;
    description?: string;
    attributes: Attribute[];
    mode?: LAUNCH_MODES;
    debug?: boolean;
    skippedIsNotIssue?: boolean;
    rerun?: boolean;
    rerunOf?: string;
    restClientConfig?: RestClientConfig;
}

function required(value: string | undefined, option: string, envVar: string): string {
    if (!value) {
        throw new Error(
            `@qavajs/playwright-report-portal: "${option}" option (or ${envVar} environment variable) is required`
        );
    }
    return value;
}

export function resolveConfig(options: ReportPortalAgentConfig = {}): ResolvedConfig {
    return {
        endpoint: required(options.endpoint ?? process.env.RP_ENDPOINT, 'endpoint', 'RP_ENDPOINT'),
        apiKey: required(options.apiKey ?? process.env.RP_API_KEY, 'apiKey', 'RP_API_KEY'),
        project: required(options.project ?? process.env.RP_PROJECT, 'project', 'RP_PROJECT'),
        launch: options.launch ?? process.env.RP_LAUNCH ?? 'Playwright BDD',
        description: options.description,
        attributes: options.attributes ?? [],
        mode: options.mode,
        debug: options.debug,
        skippedIsNotIssue: options.skippedIsNotIssue,
        rerun: options.rerun,
        rerunOf: options.rerunOf,
        restClientConfig: options.restClientConfig
    };
}
