import { defineConfig } from '@qavajs/playwright-runner-adapter';

// Step definitions are `.ts`; Node's built-in TypeScript support (no flags needed on
// Node 22.18+/23.6+) lets the adapter `require()` them directly, no transpiler needed.
export default defineConfig({
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/step_definitions/**/*.ts']
});
