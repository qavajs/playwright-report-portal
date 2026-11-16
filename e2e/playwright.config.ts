import * as path from 'node:path';
import { defineConfig, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const reporter: ReporterDescription[] = [['list']];

// Only talk to ReportPortal when credentials are provided, so `npm run test:e2e` still works
// as a dry run of the feature/step wiring without a real server.
if (process.env.RP_ENDPOINT) {
    reporter.push([
        require.resolve('../dist/index.js'),
        {
            endpoint: process.env.RP_ENDPOINT,
            apiKey: process.env.RP_API_KEY,
            project: process.env.RP_PROJECT,
            launch: process.env.RP_LAUNCH ?? '@qavajs/playwright-report-portal e2e',
            mode: process.env.RP_DEBUG ? 'DEBUG' : undefined
        }
    ]);
}

export default defineConfig({
    testDir: __dirname,
    testMatch: 'cucumber.config.ts',
    fullyParallel: true,
    // off by default - the always-failing Checkout/Wishlist scenarios don't need to retry.
    // pass `--retries=1` on the CLI to also exercise the Retry feature's retry-linking path.
    retries: 2,
    reporter
});
