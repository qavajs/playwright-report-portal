import { Given, Then } from '@qavajs/playwright-runner-adapter';
import { NoBrowserWorld } from './world';

Given('this step is flaky', async function (this: NoBrowserWorld) {
    // retries can run in a different worker process than the original attempt, so a
    // module-level counter isn't reliable - `test.info().retry` is (0 on the first
    // attempt, 1+ on retries), regardless of which worker runs it.
    const attempt = this.test.info().retry;
    if (attempt === 0) {
        throw new Error('flaky failure on the first attempt');
    }
});

Then('it eventually succeeds', async function (this: NoBrowserWorld) {
    // reaching here means the previous retry attempt succeeded
});
