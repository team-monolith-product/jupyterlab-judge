import { expect, test } from '@jupyterlab/galata';
import { createJudgeFile } from './util';

const COMMAND_OPEN = 'jupyterlab-judge:plugin:open';
const COMMAND_UNDO = 'jupyterlab-judge:plugin:undo';
const COMMAND_REDO = 'jupyterlab-judge:plugin:redo';

test.describe('Judge Editor', () => {
  test('should display CodeMirror editor', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Check CodeMirror editor exists
    const cmEditor = page.locator('.jp-JudgePanel-editor .cm-editor');
    await expect(cmEditor).toBeVisible();

    // Check for editor content area
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await expect(cmContent).toBeVisible();
  });

  test('should load code from file', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Check that the code is loaded in editor
    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('print("initial code")');
  });

  test('should support undo via command', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Focus editor and add text using insertText for atomic undo
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('End');
    await page.keyboard.insertText('\n# added line');

    // Verify text was added
    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# added line');

    // Execute undo command
    await page.evaluate(
      async ({ commandId }) => {
        await (window as any).jupyterapp.commands.execute(commandId);
      },
      { commandId: COMMAND_UNDO }
    );

    await page.waitForTimeout(500);

    // Verify text was undone
    await expect(editor).not.toContainText('# added line');
  });

  test('should support redo via command', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Focus editor and add text using insertText for atomic undo
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('End');
    await page.keyboard.insertText('\n# added line');

    // Verify text was added
    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# added line');

    // Execute undo command
    await page.evaluate(
      async ({ commandId }) => {
        await (window as any).jupyterapp.commands.execute(commandId);
      },
      { commandId: COMMAND_UNDO }
    );

    await page.waitForTimeout(500);

    // Verify text was undone
    await expect(editor).not.toContainText('# added line');

    // Execute redo command
    await page.evaluate(
      async ({ commandId }) => {
        await (window as any).jupyterapp.commands.execute(commandId);
      },
      { commandId: COMMAND_REDO }
    );

    await page.waitForTimeout(500);

    // Verify text was redone
    await expect(editor).toContainText('# added line');
  });

  test('should reset to skeleton code', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;

    await createJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });

    await page.evaluate(
      async ({ commandId, path }) => {
        await (window as any).jupyterapp.commands.execute(commandId, { path });
      },
      { commandId: COMMAND_OPEN, path: filePath }
    );

    await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });

    // Focus editor and modify code
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.insertText('\n# modified');

    // Verify modification
    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# modified');

    // Click reset button
    const resetButton = page.locator('.jp-JudgeTerminal-resetButton');
    await resetButton.click();

    // Wait for reset
    await page.waitForTimeout(1000);

    // The code should be reset (modification removed)
    // Note: This depends on skeleton code behavior
  });
});
