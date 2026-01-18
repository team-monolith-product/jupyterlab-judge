import { expect, test } from '@jupyterlab/galata';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';

test.describe('Judge Panel Structure', () => {
  test('should open panel via open command', async ({
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
  });

  test('should have three-panel layout', async ({ request, page, tmpPath }) => {
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

    // Verify three-panel structure: problem, editor, terminal/submission
    await expect(page.locator('.jp-JudgePanel-problem')).toBeVisible();
    await expect(page.locator('.jp-JudgePanel-editor')).toBeVisible();
    await expect(page.locator('.jp-JudgePanel-rightPanel')).toBeVisible();
  });

  test('should display problem panel', async ({ request, page, tmpPath }) => {
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

    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toBeVisible();
  });

  test('should display code editor', async ({ request, page, tmpPath }) => {
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

    const codeEditor = page.locator('.jp-JudgePanel-editor .cm-editor');
    await expect(codeEditor).toBeVisible();
  });

  test('should display terminal area', async ({ request, page, tmpPath }) => {
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

    const terminal = page.locator('.jp-JudgeTerminal');
    await expect(terminal).toBeVisible();
  });

  test('should display submission area', async ({ request, page, tmpPath }) => {
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

    const submissionPanel = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionPanel).toBeVisible();
  });

  test('should show problem content', async ({ request, page, tmpPath }) => {
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

    // HardCodedProblemProvider returns "덧셈" for problemId '1'
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');
  });
});
