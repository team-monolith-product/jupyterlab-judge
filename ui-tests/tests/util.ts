import { IJupyterLabPageFixture, expect } from '@jupyterlab/galata';

export interface JudgeFileContent {
  problem_id: string;
  code: string;
  judge_format?: number;
}

export interface ExecuteCommandOptions {
  commandId: string;
  args?: Record<string, unknown>;
}

/**
 * Contents API를 사용하여 judge 파일을 생성합니다.
 */
export async function createJudgeFile(
  page: IJupyterLabPageFixture,
  path: string,
  content: JudgeFileContent
): Promise<void> {
  const judgeContent = JSON.stringify({
    problem_id: content.problem_id,
    code: content.code,
    judge_format: content.judge_format ?? 1
  });

  await page.contents.uploadContent(judgeContent, 'text', path);
}

/**
 * 커널이 준비될 때까지 대기합니다.
 */
export async function waitForKernel(
  page: IJupyterLabPageFixture,
  timeout = 5000
): Promise<void> {
  try {
    await page.waitForSelector('.jp-Toolbar-kernelStatus[data-status="idle"]', {
      timeout
    });
  } catch {
    // If status bar not found, wait for session to initialize
    await page.waitForTimeout(timeout);
  }
}

/**
 * JupyterLab 커맨드를 실행합니다.
 */
export async function executeCommand(
  page: IJupyterLabPageFixture,
  options: ExecuteCommandOptions
): Promise<void> {
  await page.evaluate(
    async ({ commandId, args }) => {
      await (window as any).jupyterapp.commands.execute(commandId, args);
    },
    { commandId: options.commandId, args: options.args }
  );
}

/**
 * Judge 파일을 생성하고 패널을 엽니다.
 */
export async function openJudgeFile(
  page: IJupyterLabPageFixture,
  filePath: string,
  content: JudgeFileContent
): Promise<void> {
  await createJudgeFile(page, filePath, content);
  await executeCommand(page, {
    commandId: 'jupyterlab-judge:plugin:open',
    args: { path: filePath }
  });
  await expect(page.locator('.jp-JudgePanel')).toBeVisible({ timeout: 30000 });
}

/**
 * 커널 선택 다이얼로그를 처리하고 제출합니다.
 */
export async function submitWithKernelSelection(
  page: IJupyterLabPageFixture
): Promise<void> {
  const submitButton = page.locator('button', { hasText: /Submit|제출/ });
  await submitButton.click();

  const selectKernelButton = page.locator('.jp-Dialog button', {
    hasText: 'Select'
  });
  await selectKernelButton.waitFor({ state: 'visible' });
  await selectKernelButton.click();

  await submitButton.click();
}

/**
 * 코드 실행 버튼을 클릭하고 출력이 나타날 때까지 대기합니다.
 */
export async function executeCodeAndWait(
  page: IJupyterLabPageFixture,
  expectedOutput?: string | RegExp
): Promise<void> {
  const executeButton = page.locator('.jp-JudgeTerminal-executeButton');
  await executeButton.click();

  if (expectedOutput) {
    const outputArea = page.locator('.jp-JudgeOutputArea');
    await expect(outputArea).toContainText(expectedOutput, { timeout: 30000 });
  }
}

/**
 * undo/redo 커맨드 실행 후 UI 업데이트를 대기합니다.
 */
export async function executeUndoRedo(
  page: IJupyterLabPageFixture,
  type: 'undo' | 'redo'
): Promise<void> {
  const commandId =
    type === 'undo'
      ? 'jupyterlab-judge:plugin:undo'
      : 'jupyterlab-judge:plugin:redo';
  await executeCommand(page, { commandId });
  // Wait for editor state to update
  await page.locator('.jp-JudgePanel-editor .cm-content').waitFor({ state: 'visible' });
}
