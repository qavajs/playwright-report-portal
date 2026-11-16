# e2e

A tiny cucumber/Playwright project used to debug `@qavajs/playwright-report-portal`
against a real test run and a real ReportPortal server. It has three features: `Checkout`
(a passing scenario, a scenario with `this.log`/`this.attach`, a scenario with multiple
attachment types — JSON file + binary PNG, a scenario that deliberately fails, and a
scenario with a data table and a doc string step argument), `Wishlist` (a passing scenario
and a failing one), and `Retry` (a scenario that fails on its first attempt and passes on
retry) — enough to see every code path of the reporter, including how multiple features
are displayed as separate Suites and how retried scenarios are reported.

Retries are off by default (`retries: 0`). Run with `--retries=1` to also exercise the
`Retry` feature's retry-linking path (and retry the deliberately-failing Checkout/Wishlist
scenarios once too, still ending `FAILED`):

```bash
npx playwright test --config e2e/playwright.config.ts --retries=1
```

The reporter correctly links retry attempts server-side (confirmed via the item's
`retries` array and the launch's `hasRetries` flag), but some ReportPortal versions don't
cleanly resolve the merged-away first attempt's name in flat/breadcrumb item listings for
`STEP`-type items - the data is right even if a given UI view's labeling isn't. That's
why retries are opt-in here rather than part of the default run.

Everything here is TypeScript (`.ts`), including the step definitions. They're `require()`'d
directly by the adapter with no transpiler (`ts-node`, etc.) — Node's built-in TypeScript
support (stable by default since Node 23.6 / backported to 22.18+) strips the types at
require time. If you're on an older Node, upgrade rather than adding a transpiler.

## Dry run (no ReportPortal)

```bash
npm run build
npm run test:e2e
```

Runs the feature through Playwright with just the `list` reporter, so you can check the
adapter/step wiring without any ReportPortal credentials.

## Against a real ReportPortal server

```bash
cp e2e/.env.example e2e/.env
# fill in RP_ENDPOINT, RP_API_KEY, RP_PROJECT in e2e/.env

npm run build
npm run test:e2e
```

`e2e/playwright.config.ts` loads `e2e/.env` (gitignored, never committed) and only adds the
ReportPortal reporter when `RP_ENDPOINT` is set there.

- `RP_ENDPOINT` must include the `/api/v1` suffix.
- `RP_API_KEY` is generated from your ReportPortal user profile page.
- Optional: `RP_LAUNCH` (launch name) and `RP_DEBUG=1` (launch mode `DEBUG`).

Open the printed launch in the ReportPortal UI and check:
- three Suites: `Checkout` (five Test items), `Wishlist` (two Test items), `Retry` (one
  Test item)
- Gherkin steps nested under each scenario, in order
- the `@smoke` / `@owner:alex` / `@regression` / `@attachments` / `@flaky` tags as
  attributes
- a text log on the "I have 1 "banana" in the cart" step (`this.log`) and a JSON file log
  on "I attach debug info" (`this.attach`)
- a JSON file log and a PNG image file log on the "checkout with attachments" scenario's
  "I attach debug info" / "I attach a screenshot" steps
- the data table and doc string arguments previewed in the step names of "checkout with
  multiple items and a note"
- with `--retries=1`: the scenarios that always fail (one per feature in
  `Checkout`/`Wishlist`) end up `FAILED`, and "flaky step eventually passes" in `Retry`
  ends up `PASSED` - each with a linked retry attempt (check the item's retry history)

Re-running (`npm run test:e2e` again) starts a new launch each time.
