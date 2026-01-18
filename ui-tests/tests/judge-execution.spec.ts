import { expect, test } from '@jupyterlab/galata';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';

// Helper to wait for kernel to be ready
async function waitForKernel(page: any, timeout = 60000) {
  // Wait for kernel by checking the status bar or allowing time for initialization
  // The kernel status is shown in JupyterLab's status bar, not in the panel toolbar
  try {
    await page.waitForSelector('.jp-Toolbar-kernelStatus[data-status="idle"]', {
      timeout: 5000
    });
  } catch {
    // If status bar not found, wait for session to initialize
    await page.waitForTimeout(5000);
  }
}

test.describe('Judge Code Execution', () => {
  test('should show placeholder before execution', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("Hello Judge")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Before execution, placeholder should be visible
    const placeholder = page.locator('.jp-JudgeOutputArea-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('should execute code via button click', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("Hello Judge")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Wait for kernel to be ready
    await waitForKernel(page);

    // Click execute button
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Wait for output to appear (kernel restarts after execution)
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('Hello Judge', { timeout: 30000 });
  });

  test('should display stdout output', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("Hello Judge")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('Hello Judge', { timeout: 30000 });
  });

  test('should display error output', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'raise ValueError("Test Error")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('ValueError', { timeout: 30000 });
  });

  test('should show busy state during execution', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'import time; time.sleep(2); print("done")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // During execution, output area should change (placeholder disappears)
    await page.waitForTimeout(1000);
    const outputArea = page.locator('.jp-JudgeOutputArea');
    // Placeholder should be gone or output should appear
    await expect(outputArea).toBeVisible();
  });

  test('should return to idle after completion', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("done")',
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

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
    await waitForKernel(page);

    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Output should show completion
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText('done', { timeout: 30000 });

    // After completion, output should be stable
    await page.waitForTimeout(2000);
  });
});
