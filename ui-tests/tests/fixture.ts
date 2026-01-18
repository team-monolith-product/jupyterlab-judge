import { test as base, expect } from '@jupyterlab/galata';

/**
 * Extended test fixture that handles cleanup after each test.
 * This prevents "browserContext.close" errors from in-flight route callbacks.
 *
 * From Playwright error suggestion:
 * "Consider awaiting `await page.unrouteAll({ behavior: 'ignoreErrors' })`
 * before the end of the test to ignore remaining routes in flight."
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

export { expect };
