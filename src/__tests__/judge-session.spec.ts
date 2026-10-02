import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { Kernel } from '@jupyterlab/services';
import { JudgePanel, ValidationFailedError } from '../widgets/JudgePanel';

jest.mock('@jupyterlab/apputils', () => ({
  ...jest.requireActual('@jupyterlab/apputils'),
  SessionContext: jest.fn()
}));

function fixture() {
  const events: string[] = [];
  const kernel = {
    info: Promise.resolve({}),
    spec: Promise.resolve({ name: 'python3' }),
    interrupt: jest.fn(async () => {
      events.push('interrupt');
    }),
    requestExecute: jest.fn((content: { code: string }) => {
      const future: any = { dispose: jest.fn(), onIOPub: undefined };
      const isCode = content.code.includes('JUDGE_INPUT_STRING_IO.seek(0)');
      if (isCode) {
        events.push('run');
      }
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
  const shutdown = jest.fn(async () => {
    events.push('shutdown');
  });
  const session = {
    session: { kernel, shutdown },
    initialize: jest.fn(async () => {
      events.push('initialize');
    }),
    changeKernel: jest.fn(async () => {
      events.push('change');
    }),
    shutdown,
    dispose: jest.fn(() => {
      events.push('dispose');
    })
  };
  (SessionContext as unknown as jest.Mock).mockImplementation(() => session);
  const model = {
    problem: { id: 'problem', timeout: 1, inputTransferType: 'one_line' },
    source: 'print(input())',
    submissionStatus: { type: 'idle' },
    getTestCases: jest.fn(async () => ['', '']),
    validate: jest.fn(async () => {
      events.push('validate');
      return { results: [true, false], token: 'token' };
    }),
    submit: jest.fn(async () => {
      events.push('submit');
      return { id: 'submission' };
    })
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
  panel._submitted = {
    emit: jest.fn(() => {
      events.push('signal');
    })
  };
  return {
    panel: panel as JudgePanel,
    internals: panel,
    model,
    kernel,
    session,
    events
  };
}

describe('canonical judging session lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('preserves Hub kernel selection, testcase mapping, and submission signal ordering', async () => {
    const { panel, model, session, events, internals } = fixture();
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
    expect(events).toEqual([
      'initialize',
      'change',
      'run',
      'run',
      'validate',
      'shutdown',
      'dispose',
      'submit',
      'signal'
    ]);
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

  it('does not allocate a session for an empty testcase list', async () => {
    const { panel, model } = fixture();
    model.getTestCases.mockResolvedValue([]);
    await panel.judge();
    expect(SessionContext).not.toHaveBeenCalled();
    expect(model.submissionStatus.type).toBe('error');
  });

  it('allows lazy Python acquisition without a document kernel or an idle replacement', async () => {
    const { panel, internals, session, model } = fixture();
    class LazyPanel extends JudgePanel {
      protected createJudgeSession(): ISessionContext {
        return new SessionContext({
          sessionManager: this.session.sessionManager,
          specsManager: this.session.specsManager,
          kernelPreference: { shouldStart: false },
          name: 'Judge'
        });
      }

      protected async prepareJudgeSession(
        context: ISessionContext
      ): Promise<Kernel.IKernelConnection> {
        await context.initialize();
        await context.changeKernel({ name: 'python' });
        return context.session!.kernel!;
      }
    }
    Object.setPrototypeOf(panel, LazyPanel.prototype);
    internals._context.sessionContext.session = null;
    expect(SessionContext).not.toHaveBeenCalled();
    await panel.judge();
    expect(SessionContext).toHaveBeenCalledTimes(1);
    expect(session.changeKernel).toHaveBeenCalledTimes(1);
    expect(session.changeKernel).toHaveBeenCalledWith({ name: 'python' });
    expect(session.shutdown).toHaveBeenCalledTimes(1);
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(model.submit).toHaveBeenCalledTimes(1);
  });

  it.each(['initialize', 'changeKernel', 'run', 'validate', 'recover'])(
    'cleans up when %s rejects',
    async stage => {
      const { panel, internals, session, kernel, model, events } = fixture();
      const failure = new Error(stage);
      if (stage === 'initialize' || stage === 'changeKernel') {
        session[stage].mockRejectedValue(failure);
      }
      if (stage === 'run') {
        kernel.requestExecute.mockImplementation(() => {
          throw failure;
        });
      }
      if (stage === 'validate') {
        model.validate.mockRejectedValue(failure);
      }
      if (stage === 'recover') {
        internals.recoverJudgeSession = jest.fn().mockRejectedValue(failure);
      }
      await expect(panel.judge()).rejects.toBe(failure);
      expect(events.slice(-2)).toEqual(['shutdown', 'dispose']);
      expect(session.shutdown).toHaveBeenCalledTimes(1);
      expect(model.submit).not.toHaveBeenCalled();
      expect(internals._submitted.emit).not.toHaveBeenCalled();
    }
  );

  it('cleans up a null validation result', async () => {
    const { panel, model, session } = fixture();
    model.validate.mockResolvedValue(null as any);
    await expect(panel.judge()).rejects.toBeInstanceOf(ValidationFailedError);
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(model.submit).not.toHaveBeenCalled();
  });

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
    expect(model.submit).not.toHaveBeenCalled();
  });

  it('has already cleaned up when backend submit fails', async () => {
    const { panel, model, session, internals } = fixture();
    model.submit.mockRejectedValue(new Error('backend'));
    await expect(panel.judge()).rejects.toThrow('backend');
    expect(session.shutdown).toHaveBeenCalledTimes(1);
    expect(session.dispose).toHaveBeenCalledTimes(1);
    expect(internals._submitted.emit).not.toHaveBeenCalled();
  });

  it.each([1, 2])(
    'recovers a Lite forced TLE only when another testcase remains (%i cases)',
    async count => {
      jest.useFakeTimers();
      const { panel, internals, model, session, kernel, events } = fixture();
      model.getTestCases.mockResolvedValue(Array(count).fill(''));
      const replacement = { ...kernel, requestExecute: kernel.requestExecute };
      const originalExecute = kernel.requestExecute.getMockImplementation()!;
      kernel.requestExecute = jest.fn((content: { code: string }) => {
        if (content.code.includes('JUDGE_INPUT_STRING_IO.seek(0)')) {
          events.push('hang');
          return { done: new Promise(() => {}), dispose: jest.fn() };
        }
        return originalExecute(content);
      });
      internals.interruptJudgeKernel = jest.fn(async () => {
        events.push('timeout');
      });
      internals.recoverJudgeSession = jest.fn(async (_session, result) => {
        expect(result).toMatchObject({ status: 'TLE', cpuTime: null });
        await session.shutdown();
        events.push('replace');
        session.session.kernel = replacement;
        return replacement;
      });
      const judging = panel.judge();
      await jest.advanceTimersByTimeAsync(1200);
      await judging;
      expect(kernel.interrupt).not.toHaveBeenCalled();
      expect(internals.recoverJudgeSession).toHaveBeenCalledTimes(count - 1);
      expect(events).toEqual(
        count === 2
          ? [
              'initialize',
              'change',
              'hang',
              'timeout',
              'shutdown',
              'replace',
              'run',
              'validate',
              'shutdown',
              'dispose',
              'submit',
              'signal'
            ]
          : [
              'initialize',
              'change',
              'hang',
              'timeout',
              'validate',
              'shutdown',
              'dispose',
              'submit',
              'signal'
            ]
      );
      expect(model.validate).toHaveBeenCalledWith(
        count === 2 ? [null, 'answer'] : [null]
      );
      expect(jest.getTimerCount()).toBe(0);
    }
  );

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
