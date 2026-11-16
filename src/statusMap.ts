import { STATUSES } from '@reportportal/client-javascript/constants';
import type { TestStatus } from '@playwright/test/reporter';

const STATUS_MAP: Partial<Record<TestStatus, STATUSES>> = {
    passed: STATUSES.PASSED,
    failed: STATUSES.FAILED,
    timedOut: STATUSES.FAILED,
    interrupted: STATUSES.INTERRUPTED,
    skipped: STATUSES.SKIPPED
};

export function mapStatus(status: TestStatus): STATUSES {
    return STATUS_MAP[status] ?? STATUSES.FAILED;
}
