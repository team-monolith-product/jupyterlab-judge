import { SessionContext } from '@jupyterlab/apputils';
import { JudgePanel } from '../widgets/JudgePanel';

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  SessionContext: jest.fn()
}));

function fixture() {
  const kernel = {
    info: Promise.resolve({}),
    spec: Promise.resolve({ name: 'python3' }),
    interrupt: jest.fn(async () => {}),
    requestExecute: jest.fn((content: { code: string }) => {
      const future: any = { dispose: jest.fn(), onIOPub: undefined };
      const isCode = content.code.includes('JUDGE_INPUT_STRING_IO.seek(0)');
      future.done = Promise.resolve().then(() => {
        if (isCode) {
          future.onIOPub?.({
            header: { msg_type: 'stream' },
            content: { name: 'stdout', text: 'answer' }
          });
        }
        return { content: { status: 'ok' } };
      });
      return future;
    })
  };
  const shutdown = jest.fn(async () => {});
  const session = {
    session: { kernel, shutdown },
    initialize: jest.fn(async () => {}),
    changeKernel: jest.fn(async () => {}),
    shutdown,
    dispose: jest.fn()
  };
  (SessionContext as unknown as jest.Mock).mockImplementation(() => session);
  const model = {
    problem: { id: 'problem', timeout: 1, inputTransferType: 'one_line' },
    source: 'print(input())',
    submissionStatus: { type: 'idle' },
    getTestCases: jest.fn(async () => ['', '']),
    validate: jest.fn(async () => ({ results: [true, false], token: 'token' })),
    submit: jest.fn(async () => ({ id: 'submission' }))
  };
  const panel: any = Object.create(JudgePanel.prototype);
  panel._context = {
    model,
    sessionContext: {
      session: { kernel },
      sessionManager: {},
      specsManager: {}
    }
  };
  panel._trans = { __: (message: string) => message };
  panel._sessionContextDialogs = { selectKernel: jest.fn() };
  panel._submitted = { emit: jest.fn() };
  return {
    panel: panel as JudgePanel,
    internals: panel,
    model,
    kernel,
    session
  };
}

describe('canonical judging session lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('preserves Hub kernel selection and submission results', async () => {
    const { panel, model, session, internals } = fixture();
    await panel.judge();
    expect(session.changeKernel).toHaveBeenCalledWith({ name: 'python3' });
    expect(model.validate).toHaveBeenCalledWith(['answer', 'answer']);
    expect(model.submit).toHaveBeenCalledWith(
      {
        problemId: 'problem',
        code: 'print(input())',
        language: 'python',
        token: 'token',
        details: [
          { status: 'AC', cpuTime: expect.any(Number), memory: 0 },
          {
            status: 'WA',
            answer: 'answer',
            cpuTime: expect.any(Number),
            memory: 0
          }
        ]
      },
      panel
    );
    expect(internals._submitted.emit).toHaveBeenCalledTimes(1);
    expect(model.submissionStatus).toEqual({ type: 'idle' });
  });

  it('does not allocate a judge session when Hub has no selected kernel', async () => {
    const { panel, internals, model } = fixture();
    internals._context.sessionContext.session = null;
    await panel.judge();
    expect(SessionContext).not.toHaveBeenCalled();
    expect(internals._sessionContextDialogs.selectKernel).toHaveBeenCalled();
    expect(model.submit).not.toHaveBeenCalled();
  });

  it.each(['changeKernel', 'run', 'recover'])(
    'cleans up when %s rejects',
    async stage => {
      const { panel, internals, session, kernel, model } = fixture();
      const failure = new Error(stage);
      if (stage === 'changeKernel') {
        session.changeKernel.mockRejectedValue(failure);
      }
      if (stage === 'run') {
        kernel.requestExecute.mockImplementation(() => {
          throw failure;
        });
      }
      if (stage === 'recover') {
        internals.recoverJudgeSession = jest.fn().mockRejectedValue(failure);
      }
      await expect(panel.judge()).rejects.toBe(failure);
      expect(session.shutdown).toHaveBeenCalledTimes(1);
      expect(session.dispose).toHaveBeenCalledTimes(1);
      expect(model.submit).not.toHaveBeenCalled();
      expect(internals._submitted.emit).not.toHaveBeenCalled();
    }
  );

  it('does not wait on the real context shutdown gate after initialization fails', async () => {
    const { panel, model } = fixture();
    const failure = new Error('session manager unavailable');
    const ActualSessionContext = jest.requireActual(
      '@jupyterlab/apputils'
    ).SessionContext;
    const context = new ActualSessionContext({
      sessionManager: {
        ready: Promise.resolve(),
        refreshRunning: async () => {
          throw failure;
        }
      },
      specsManager: {},
      name: 'Judge'
    });
    (SessionContext as unknown as jest.Mock).mockImplementationOnce(
      () => context
    );
    await expect(panel.judge()).rejects.toBe(failure);
    expect(context.isDisposed).toBe(true);
    expect(model.submit).not.toHaveBeenCalled();
  });

  it('disposes even if shutdown fails and does not submit', async () => {
    const { panel, model, session } = fixture();
    session.shutdown.mockRejectedValue(new Error('shutdown'));
    await expect(panel.judge()).rejects.toThrow('shutdown');
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(model.validate).not.toHaveBeenCalled();
    expect(model.submit).not.toHaveBeenCalled();
  });

  it('preserves the execution error when cleanup also fails', async () => {
    const { panel, session, kernel, model } = fixture();
    const failure = new Error('execution');
    const cleanupFailure = new Error('shutdown');
    const report = jest.spyOn(console, 'error').mockImplementation(() => {});
    kernel.requestExecute.mockImplementation(() => {
      throw failure;
    });
    session.shutdown.mockRejectedValue(cleanupFailure);
    await expect(panel.judge()).rejects.toBe(failure);
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      'Failed to dispose the judge session',
      cleanupFailure
    );
    expect(model.validate).not.toHaveBeenCalled();
    expect(model.submit).not.toHaveBeenCalled();
  });

  it('shuts down the session before validation after the last hard timeout', async () => {
    jest.useFakeTimers();
    const { panel, internals, session, kernel, model } = fixture();
    model.getTestCases.mockResolvedValue(['']);
    const originalExecute = kernel.requestExecute.getMockImplementation()!;
    kernel.requestExecute = jest.fn((content: { code: string }) =>
      content.code.includes('JUDGE_INPUT_STRING_IO.seek(0)')
        ? { done: new Promise(() => {}), dispose: jest.fn() }
        : originalExecute(content)
    );
    internals.recoverJudgeSession = jest.fn();
    let finishValidation!: (value: {
      results: boolean[];
      token: string;
    }) => void;
    model.validate.mockImplementation(
      () =>
        new Promise(resolve => {
          finishValidation = resolve;
        })
    );
    const judging = panel.judge();
    await jest.advanceTimersByTimeAsync(1200);
    expect(model.validate).toHaveBeenCalledWith([null]);
    expect(kernel.interrupt).toHaveBeenCalledTimes(1);
    expect(session.shutdown).toHaveBeenCalledTimes(1);
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(internals.recoverJudgeSession).not.toHaveBeenCalled();
    expect(model.submit).not.toHaveBeenCalled();
    finishValidation({ results: [false], token: 'token' });
    await judging;
    expect(model.submit).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses the recovered kernel for the next testcase after a hard timeout', async () => {
    jest.useFakeTimers();
    const { panel, internals, model, session, kernel } = fixture();
    const replacement = { ...kernel, requestExecute: kernel.requestExecute };
    const originalExecute = kernel.requestExecute.getMockImplementation()!;
    kernel.requestExecute = jest.fn((content: { code: string }) => {
      if (content.code.includes('JUDGE_INPUT_STRING_IO.seek(0)')) {
        return { done: new Promise(() => {}), dispose: jest.fn() };
      }
      return originalExecute(content);
    });
    internals.recoverJudgeSession = jest.fn(async (_session, result) => {
      expect(result).toMatchObject({ status: 'TLE', cpuTime: null });
      session.session.kernel = replacement;
      return replacement;
    });
    const judging = panel.judge();
    await jest.advanceTimersByTimeAsync(1200);
    await judging;
    expect(kernel.interrupt).toHaveBeenCalledTimes(1);
    expect(internals.recoverJudgeSession).toHaveBeenCalledTimes(1);
    expect(model.validate).toHaveBeenCalledWith([null, 'answer']);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans up on Hub readiness timeout and clears the timer', async () => {
    jest.useFakeTimers();
    const { panel, kernel, session } = fixture();
    kernel.info = new Promise(() => {});
    const judging = expect(panel.judge()).rejects.toThrow(
      'Kernel is not responding'
    );
    await jest.advanceTimersByTimeAsync(20000);
    await judging;
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
