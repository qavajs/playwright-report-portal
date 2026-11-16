# @qavajs/playwright-report-portal

[ReportPortal](https://reportportal.io/) reporter for
[@qavajs/playwright-runner-adapter](https://www.npmjs.com/package/@qavajs/playwright-runner-adapter).
Translates the adapter's Feature → Scenario → Step tree into ReportPortal's
Launch → Suite → Test → Step hierarchy in real time, reusing
[`@reportportal/client-javascript`](https://www.npmjs.com/package/@reportportal/client-javascript).

## Installation

```bash
npm install @qavajs/playwright-report-portal
```

## Usage

This reporter requires [@qavajs/playwright-runner-adapter](https://www.npmjs.com/package/@qavajs/playwright-runner-adapter)
to already be wired up in your project — it only reports the cucumber scenarios the adapter
produces, so add it to the `reporter` array of the same `playwright.config.ts` the adapter runs
through:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import type { ReportPortalAgentConfig } from '@qavajs/playwright-report-portal';

const rpConfig: ReportPortalAgentConfig = {
    endpoint: 'https://reportportal.example.com/api/v1',
    apiKey: process.env.RP_API_KEY,
    project: 'my_project',
    launch: 'Playwright BDD'
};

export default defineConfig({
    testMatch: 'cucumber.config.ts', // or wherever your adapter config lives
    reporter: [
        ['html'],
        ['@qavajs/playwright-report-portal', rpConfig]
    ]
});
```

## Configuration

| Option | Type | Description |
|---|---|---|
| `endpoint` | `string` | ReportPortal server URL. Falls back to `RP_ENDPOINT`. **Required.** |
| `apiKey` | `string` | ReportPortal API key. Falls back to `RP_API_KEY`. **Required.** |
| `project` | `string` | ReportPortal project name. Falls back to `RP_PROJECT`. **Required.** |
| `launch` | `string` | Launch name. Falls back to `RP_LAUNCH`, then `'Playwright BDD'`. |
| `description` | `string` | Launch description. |
| `attributes` | `{ key?, value }[]` | Launch level attributes. |
| `mode` | `'DEFAULT' \| 'DEBUG'` | Launch mode. |
| `debug` | `boolean` | Enables the ReportPortal client's own HTTP debug logging. |
| `skippedIsNotIssue` | `boolean` | When `true`, skipped scenarios aren't flagged "to investigate". |
| `rerun` / `rerunOf` | `boolean` / `string` | Marks the launch as a rerun of an existing one. |
| `restClientConfig` | `object` | Passed through to the REST client (proxy, headers, retry). |

## Reporting model

- Only cucumber scenarios are reported — tests without the adapter's `uri`/`name`
  annotations (e.g. plain Playwright tests in the same run) are ignored.
- **Feature** (the adapter's `test.describe()` per feature file) → ReportPortal `SUITE`.
- **Scenario** → ReportPortal `STEP` with `hasStats: true` (the item type ReportPortal counts
  launch/suite pass-fail-skip statistics from), with the scenario's Gherkin tags (as kept on
  Playwright's `test.tags`) converted to attributes: `@key:value` → `{ key, value }`, plain
  `@tag` → `{ value: tag }`.
- Every `test.step()` the adapter creates — Gherkin steps and `Before`/`After`/`BeforeStep`/`AfterStep`
  hooks alike — becomes a nested ReportPortal `STEP` with `hasStats: false`, preserving the exact
  nesting Playwright's own HTML report and trace viewer show (no re-parsing of `.feature` files).
- `this.attach()` / `this.log()` calls land as logs on the step/hook that made them: `this.log()`
  becomes a plain text log, other attachments (screenshots, JSON, etc.) become a log with a file.
- A step/hook error becomes an `ERROR` log on that step plus a `FAILED` status; a scenario failure
  outside of any step (e.g. in a fixture or `world.init`) becomes an `ERROR` log on the scenario item.
- Retried scenarios are reported using ReportPortal's native retry support (`retry: true`) rather
  than only keeping the last attempt.

## Limitations

- `BeforeAll` / `AfterAll` hooks are not reported — Playwright's reporter API doesn't fire a
  test-level event for them.
- Gherkin keywords (`Given`/`When`/`Then`) aren't recovered from the `.feature` file; step names
  in ReportPortal are exactly what the adapter already shows in Playwright's own report.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE)
