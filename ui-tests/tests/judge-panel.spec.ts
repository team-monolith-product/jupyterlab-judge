import { expect, test } from './fixture';
import { openJudgeFile } from './util';

test.describe('Judge Panel Structure', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'print("hello")'
    });
  });

  test('should open panel via open command', async ({ page }) => {
    await expect(page.locator('.jp-JudgePanel')).toBeVisible();
  });

  test('should have three-panel layout', async ({ page }) => {
    await expect(page.locator('.jp-JudgePanel-problem')).toBeVisible();
    await expect(page.locator('.jp-JudgePanel-editor')).toBeVisible();
    await expect(page.locator('.jp-JudgePanel-rightPanel')).toBeVisible();
  });

  test('should display problem panel', async ({ page }) => {
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toBeVisible();
  });

  test('should display code editor', async ({ page }) => {
    const codeEditor = page.locator('.jp-JudgePanel-editor .cm-editor');
    await expect(codeEditor).toBeVisible();
  });

  test('should display terminal area', async ({ page }) => {
    const terminal = page.locator('.jp-JudgeTerminal');
    await expect(terminal).toBeVisible();
  });

  test('should display submission area', async ({ page }) => {
    const submissionPanel = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionPanel).toBeVisible();
  });

  test('should show problem content', async ({ page }) => {
    const problemPanel = page.locator('.jp-JudgePanel-problem');
    await expect(problemPanel).toContainText('덧셈');
  });
});
