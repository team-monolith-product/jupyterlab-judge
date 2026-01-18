import { expect, test } from '@jupyterlab/galata';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';

test.describe('Judge Submission', () => {
  test('should have submit button', async ({ page, request, tmpPath }) => {
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

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await expect(submitButton).toBeVisible();
  });

  test('should show progress during submission', async ({
    page,
    request,
    tmpPath
  }) => {
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

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Click submit button (first time triggers kernel selection)
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Handle kernel selection dialog
    const selectKernelButton = page.locator('.jp-Dialog button', {
      hasText: 'Select'
    });
    await selectKernelButton.waitFor({ state: 'visible' });
    await selectKernelButton.click();

    // Click submit again after kernel selection
    await submitButton.click();

    // During submission, button should be disabled
    await expect(submitButton).toBeDisabled();
  });

  test('should show AC for correct answer', async ({
    page,
    request,
    tmpPath
  }) => {
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

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Click submit button (first time triggers kernel selection)
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Handle kernel selection dialog
    const selectKernelButton = page.locator('.jp-Dialog button', {
      hasText: 'Select'
    });
    await selectKernelButton.waitFor({ state: 'visible' });
    await selectKernelButton.click();

    // Click submit again after kernel selection
    await submitButton.click();

    // Wait for submission to complete - check for Accepted status
    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });
  });

  test('should show WA for wrong answer', async ({
    page,
    request,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a - b)', // Wrong: subtraction
      judge_format: 1
    });

    const filePath = `${tmpPath}/덧셈.judge`;

    const response = await request.put(`/api/contents/${filePath}`, {
      data: { type: 'file', format: 'text', content: judgeContent }
    });
    expect(response.ok()).toBeTruthy();

    await page.goto();

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Click submit button (first time triggers kernel selection)
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Handle kernel selection dialog
    const selectKernelButton = page.locator('.jp-Dialog button', {
      hasText: 'Select'
    });
    await selectKernelButton.waitFor({ state: 'visible' });
    await selectKernelButton.click();

    // Click submit again after kernel selection
    await submitButton.click();

    // Wait for submission to complete - check for Wrong status
    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Wrong|❌/, { timeout: 30000 });
  });

  test('should display submission history after submit', async ({
    page,
    request,
    tmpPath
  }) => {
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

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible();

    // Click submit button (first time triggers kernel selection)
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await submitButton.click();

    // Handle kernel selection dialog
    const selectKernelButton = page.locator('.jp-Dialog button', {
      hasText: 'Select'
    });
    await selectKernelButton.waitFor({ state: 'visible' });
    await selectKernelButton.click();

    // Click submit again after kernel selection
    await submitButton.click();

    // Wait for submission to complete
    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });

    // Verify submission area shows history (list item should exist)
    const historyItem = page.locator('.jp-JudgePanel-submissionPanel li');
    await expect(historyItem.first()).toBeVisible();
  });
});
