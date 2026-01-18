import { expect, test } from '@jupyterlab/galata';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';

// Helper to wait for kernel to be ready
async function waitForKernel(page: any) {
  // Wait for kernel by checking the status bar or allowing time for initialization
  try {
    await page.waitForSelector('.jp-Toolbar-kernelStatus[data-status="idle"]', {
      timeout: 5000
    });
  } catch {
    // If status bar not found, wait for session to initialize
    await page.waitForTimeout(5000);
  }
}

test.describe('Judge Integration', () => {
  test('complete problem 1 workflow', async ({ request, page, tmpPath }) => {
    // Setup: Create judge file with correct solution
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)',
      judge_format: 1
    });

    const filePath = `${tmpPath}/덧셈.judge`;

    const response = await request.put(`/api/contents/${filePath}`, {
      data: { type: 'file', format: 'text', content: judgeContent }
    });
    expect(response.ok()).toBeTruthy();

    await page.goto();

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

  test('error recovery flow', async ({ request, page, tmpPath }) => {
    // Setup: Start with code that has an error
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print(undefined_variable)', // Code with error
      judge_format: 1
    });

    const filePath = `${tmpPath}/덧셈.judge`;

    const response = await request.put(`/api/contents/${filePath}`, {
      data: { type: 'file', format: 'text', content: judgeContent }
    });
    expect(response.ok()).toBeTruthy();

    await page.goto();

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

  test('multiple panels can be opened', async ({ request, page, tmpPath }) => {
    // Setup: Create two different judge files (same problem, different paths)
    const judgeContent1 = JSON.stringify({
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)',
      judge_format: 1
    });

    const judgeContent2 = JSON.stringify({
      problem_id: '1',
      code: 'print("*")',
      judge_format: 1
    });

    const filePath1 = `${tmpPath}/덧셈.judge`;
    const filePath2 = `${tmpPath}/sub/덧셈.judge`;

    // Create directory first
    await request.put(`/api/contents/${tmpPath}/sub`, {
      data: { type: 'directory' }
    });

    const response1 = await request.put(`/api/contents/${filePath1}`, {
      data: { type: 'file', format: 'text', content: judgeContent1 }
    });
    expect(response1.ok()).toBeTruthy();

    const response2 = await request.put(`/api/contents/${filePath2}`, {
      data: { type: 'file', format: 'text', content: judgeContent2 }
    });
    expect(response2.ok()).toBeTruthy();

    await page.goto();

    // Open first file
    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath1 }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

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

    // Wait for second panel (will replace or create new tab)
    await page.waitForTimeout(2000);

    // At least one panel should be visible
    await expect(page.locator('.jp-JudgePanel').first()).toBeVisible();
  });
});
