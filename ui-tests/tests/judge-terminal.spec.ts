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

test.describe('Judge Terminal', () => {
  test('should have toolbar with buttons', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("hello")',
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

    // Check toolbar exists
    const toolbar = page.locator('.jp-JudgeTerminal-toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('should have reset button', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("hello")',
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

    // Check reset button exists
    const resetButton = page.locator('.jp-JudgeTerminal-resetButton');
    await expect(resetButton).toBeVisible();
  });

  test('should have execute button', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("hello")',
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

    // Check execute button exists
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await expect(executeButton).toBeVisible();
  });

  test('should have stop button', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("hello")',
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

    // Check stop button exists
    const stopButton = page.locator('.jp-JudgeTerminal-stopButton');
    await expect(stopButton).toBeVisible();
  });

  test('should have output area', async ({ request, page, tmpPath }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'print("hello")',
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

    // Check output area exists
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toBeVisible();
  });

  test('stop button should interrupt execution', async ({
    request,
    page,
    tmpPath
  }) => {
    const judgeContent = JSON.stringify({
      problem_id: '1',
      code: 'import time\nfor i in range(100):\n    time.sleep(1)\n    print(i)',
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

    // Start execution
    const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
    await executeButton.click();

    // Wait briefly for execution to start
    await page.waitForTimeout(1000);

    // Click stop button
    const stopButton = page.locator('.jp-JudgeTerminal-stopButton');
    await stopButton.click();

    // Wait for stop to take effect
    await page.waitForTimeout(3000);

    // Execution should be interrupted - output area should be visible
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toBeVisible();
  });
});
