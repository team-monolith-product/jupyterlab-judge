/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  // Default timeout for each test (galata default is 60s)
  timeout: 60000,
  expect: {
    // Default timeout for expect() assertions: 10 seconds
    timeout: 10000
  },
  use: {
    ...baseConfig.use,
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    // Action timeout: 10 seconds
    actionTimeout: 10000
  },
  webServer: {
    // Save server logs to jupyter-server.log (in ui-tests folder)
    command: 'jlpm start 2>&1 | tee jupyter-server.log',
    url: 'http://localhost:8888/lab',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  }
};
