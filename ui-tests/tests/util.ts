import { IJupyterLabPageFixture } from '@jupyterlab/galata';

export interface JudgeFileContent {
  problem_id: string;
  code: string;
  judge_format?: number;
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
