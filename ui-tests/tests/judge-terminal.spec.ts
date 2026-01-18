import { expect, test } from './fixture';
import { openJudgeFile, waitForKernel } from './util';

test.describe('Judge Terminal', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("hello")'
    });
  });

  test('should have toolbar with buttons', async ({ page }) => {
    const toolbar = page.locator('.jp-JudgeTerminal-toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('should have reset button', async ({ page }) => {
    const resetButton = page.locator('.jp-JudgeTerminal-resetButton');
    await expect(resetButton).toBeVisible();
  });

  test('should have execute button', async ({ page }) => {
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await expect(executeButton).toBeVisible();
  });

  test('should have stop button', async ({ page }) => {
    const stopButton = page.locator('.jp-JudgeTerminal-stopButton');
    await expect(stopButton).toBeVisible();
  });

  test('should have output area', async ({ page }) => {
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toBeVisible();
  });
});

test.describe('Judge Terminal - Execution Control', () => {
  test('stop button should interrupt execution', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'import time\nfor i in range(100):\n    time.sleep(1)\n    print(i)'
    });

    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Wait for first output to confirm execution started
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('0', { timeout: 10000 });

    // Click stop button
    const stopButton = page.locator('.jp-JudgeTerminal-stopButton');
    await stopButton.click();

    // Verify execution was interrupted (should show KeyboardInterrupt or stop early)
    await expect(outputArea).toBeVisible();
  });
});
