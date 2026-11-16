# Change Log

All notable changes to the "@qavajs/playwright-report-portal" will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

:rocket: - new feature
:beetle: - bugfix
:x: - deprecation

## [1.0.0]
- :rocket: initial release
- :rocket: translates `@qavajs/playwright-runner-adapter`'s Feature → Scenario → Step tree into
  ReportPortal's Launch → Suite → Test → Step hierarchy in real time
- :rocket: reports Gherkin tags as ReportPortal attributes, `this.attach()`/`this.log()` calls as logs,
  and retried scenarios using ReportPortal's native retry support
