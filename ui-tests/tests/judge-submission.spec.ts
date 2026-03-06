import { expect, test } from './fixture';
import { openJudgeFile, submitWithKernelSelection } from './util';

test.describe('Judge Submission', () => {
  test('should have submit button', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await expect(submitButton).toBeVisible();
  });

  test('should show progress during submission', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await submitWithKernelSelection(page);

    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await expect(submitButton).toBeDisabled();
  });

  test('should show AC for correct answer', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await submitWithKernelSelection(page);

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });
  });

  test('should show WA for wrong answer', async ({ page, tmpPath }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a - b)'
    });

    await submitWithKernelSelection(page);

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Wrong|❌/, { timeout: 30000 });
  });

  test('should display submission history after submit', async ({
    page,
    tmpPath
  }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await submitWithKernelSelection(page);

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });

    const historyItem = page.locator('.jp-JudgePanel-submissionPanel li');
    await expect(historyItem.first()).toBeVisible();
  });

  test('should update submission result without page reload', async ({
    page,
    tmpPath
  }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await submitWithKernelSelection(page);

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });

    const historyItems = page.locator('.jp-JudgePanel-submissionPanel li');
    const firstCount = await historyItems.count();
    expect(firstCount).toBeGreaterThanOrEqual(1);

    // Submit again without reloading the page
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await expect(submitButton).toBeEnabled({ timeout: 30000 });
    await submitButton.click();

    // Wait for second result to appear without page reload
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });
    await expect(historyItems).toHaveCount(firstCount + 1, { timeout: 30000 });
  });

  test('should update result immediately after wrong answer submission', async ({
    page,
    tmpPath
  }) => {
    const filePath = `${tmpPath}/덧셈.judge`;
    await openJudgeFile(page, filePath, {
      problem_id: '1',
      code: 'a, b = map(int, input().split())\nprint(a + b)'
    });

    await submitWithKernelSelection(page);

    const submissionArea = page.locator('.jp-JudgePanel-submissionPanel');
    await expect(submissionArea).toContainText(/Accepted|👍/, { timeout: 30000 });

    // Change code to produce wrong answer
    const cmContent = page.locator('.jp-JudgePanel-editor .cm-content');
    await cmContent.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.insertText('a, b = map(int, input().split())\nprint(a - b)');

    // Submit wrong answer without page reload
    const submitButton = page.locator('button', { hasText: /Submit|제출/ });
    await expect(submitButton).toBeEnabled({ timeout: 30000 });
    await submitButton.click();

    // Verify WA result appears without reload
    await expect(submissionArea).toContainText(/Wrong|❌/, { timeout: 30000 });
  });
});
