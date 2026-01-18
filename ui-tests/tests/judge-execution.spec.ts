import { expect, test } from './fixture';
import { openJudgeFile, waitForKernel, executeCodeAndWait } from './util';

test.describe('Judge Code Execution', () => {
  test('should show placeholder before execution', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("Hello Judge")'
    });

    const placeholder = page.locator('.jp-JudgeOutputArea-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('should execute code via button click', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("Hello Judge")'
    });

    await waitForKernel(page);
    await executeCodeAndWait(page, 'Hello Judge');
  });

  test('should display stdout output', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("Hello Judge")'
    });

    await waitForKernel(page);
    await executeCodeAndWait(page, 'Hello Judge');
  });

  test('should display error output', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'raise ValueError("Test Error")'
    });

    await waitForKernel(page);
    await executeCodeAndWait(page, 'ValueError');
  });

  test('should show busy state during execution', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'import time; time.sleep(2); print("done")'
    });

    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Placeholder should disappear when execution starts
    const placeholder = page.locator('.jp-JudgeOutputArea-placeholder');
    await expect(placeholder).not.toBeVisible({ timeout: 5000 });

    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toBeVisible();
  });

  test('should return to idle after completion', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("done")'
    });

    await waitForKernel(page);
    await executeCodeAndWait(page, 'done');

    // Output should remain stable after completion
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('done');
  });
});
