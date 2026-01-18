import { expect, test } from './fixture';
import { openJudgeFile, executeUndoRedo } from './util';

test.describe('Judge Editor', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("initial code")'
    });
  });

  test('should display CodeMirror editor', async ({ page }) => {
    const cmEditor = page.locator('.jp-JudgePanel-editor .cm-editor');
    await expect(cmEditor).toBeVisible();

    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await expect(cmContent).toBeVisible();
  });

  test('should load code from file', async ({ page }) => {
    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('print("initial code")');
  });

  test('should support undo via command', async ({ page }) => {
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('End');
    await page.keyboard.insertText('\n# added line');

    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# added line');

    await executeUndoRedo(page, 'undo');

    await expect(editor).not.toContainText('# added line');
  });

  test('should support redo via command', async ({ page }) => {
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('End');
    await page.keyboard.insertText('\n# added line');

    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# added line');

    await executeUndoRedo(page, 'undo');
    await expect(editor).not.toContainText('# added line');

    await executeUndoRedo(page, 'redo');
    await expect(editor).toContainText('# added line');
  });

  test('should reset to skeleton code', async ({ page }) => {
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.insertText('\n# modified');

    const editor = page.locator('.jp-JudgePanel-editor');
    await expect(editor).toContainText('# modified');

    const resetButton = page.locator('.jp-JudgeTerminal-resetButton');
    await resetButton.click();

    await expect(editor).not.toContainText('# modified');
  });
});
