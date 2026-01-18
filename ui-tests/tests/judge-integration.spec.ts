import { expect, test } from '@jupyterlab/galata';
import { createJudgeFile, waitForKernel } from './util';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';

test.describe('Judge Integration', () => {
  test('complete problem 1 workflow', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    // Step 1: Open the judge panel
    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Step 2: Verify problem is displayed
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');

    // Step 3: Wait for kernel to be ready
    await waitForKernel(page);

    // Step 4: Test execution with execute button
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Wait for execution to complete
    await page.waitForTimeout(5000);

    // Step 5: Submit the solution
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Step 6: Verify accepted result
    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 60000 });
  });

  test('error recovery flow', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print(undefined_variable)' // Code with error
    });

    // Open panel
    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
    await waitForKernel(page);

    // Step 1: Execute the error code
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Verify error is shown
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('NameError', { timeout: 30000 });

    // Wait for kernel to restart
    await page.waitForTimeout(5000);

    // Step 2: Fix the error - clear and write correct code
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();

    // Select all and delete
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');

    // Type correct code
    await page.keyboard.insertText(
      'a, b = map(int, input().split())\nprint(a + b)'
    );

    // Step 3: Submit and verify success
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
    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath1 }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Verify problem 1 content
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');

    // Open second file
    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath2 }
    );

    // Verify second file's code is visible in active panel
    const editor = page.locator('.jp-JudgePanel-editor:visible');
    await expect(editor).toContainText('print("*")');
  });
});
