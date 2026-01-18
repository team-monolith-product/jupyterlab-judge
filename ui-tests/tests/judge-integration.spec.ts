import { expect, test } from './fixture';
import {
  openJudgeFile,
  createJudgeFile,
  executeCommand,
  waitForKernel,
  executeCodeAndWait
} from './util';

test.describe('Judge Integration', () => {
  test('complete problem 1 workflow', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    // Verify problem is displayed
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');

    // Wait for kernel and test execution
    await waitForKernel(page);
    await executeCodeAndWait(page);

    // Submit the solution
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Verify accepted result
    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 60000 });
  });

  test('error recovery flow', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print(undefined_variable)'
    });

    await waitForKernel(page);

    // Execute the error code
    await executeCodeAndWait(page, 'NameError');

    // Fix the error - clear and write correct code
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(
      'a, b = map(int, input().split())\nprint(a + b)'
    );

    // Submit and verify success
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 60000 });
  });

  test('multiple panels can be opened', async ({ page, tmpPath }) => {
    const filePath1 = `${tmpPath}/덧셈.judge`;
    const filePath2 = `${tmpPath}/sub/덧셈.judge`;

    await createJudgeFile(page, filePath1, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await createJudgeFile(page, filePath2, {
      problem_id: '1',
      code: 'print("*")'
    });

    // Open first file
    await executeCommand(page, {
      commandId: 'jupyterlab-judge:plugin:open',
      args: { path: filePath1 }
    });
    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Verify problem 1 content
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');

    // Open second file
    await executeCommand(page, {
      commandId: 'jupyterlab-judge:plugin:open',
      args: { path: filePath2 }
    });

    // Verify second file's code is visible in active panel
    const editor = page.locator('.jp-JudgePanel-editor:visible');
    await expect(editor).toContainText('print("*")');
  });
});
