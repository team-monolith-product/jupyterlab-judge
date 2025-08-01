import {
  Dialog,
  ISessionContext,
  ISessionContextDialogs,
  SessionContext,
  showDialog
} from '@jupyterlab/apputils';
import { Message } from '@lumino/messaging';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  CodeEditor,
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { CommandRegistry } from '@lumino/commands';
import { OutputArea } from '@jupyterlab/outputarea';
import { KernelMessage } from '@jupyterlab/services';
import {
  IErrorMsg,
  IStreamMsg
} from '@jupyterlab/services/lib/kernel/messages';
import { JudgeModel } from '../model';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { ToolbarItems } from '../toolbar';
import { TRANSLATOR_DOMAIN } from '../constants';
import { Signal } from '@lumino/signaling';
import { BoxPanel, SplitPanel, Widget } from '@lumino/widgets';
import { JudgeTerminal } from './JudgeTerminal';
import { JudgeSubmissionArea } from './JudgeSubmissionArea';
import { SubmissionList } from '../components/SubmissionList';
import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';
import { JudgeSignal } from '../tokens';
import { customJudgeColorSvg } from '@team-monolith/cds';
import { IJudgeProblemPanel, JudgeProblemPanel } from './JudgeProblemPanel';
import { IControlButtonProps } from '../components';

function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, byte => String.fromCodePoint(byte)).join(
    ''
  );
  return btoa(binString);
}

const JudgeColorLabIcon = new LabIcon({
  name: 'jupyterlab-judge:problem-icon',
  svgstr: customJudgeColorSvg
});

type IRunResult =
  | {
      status: 'OK' | 'OLE';
      output: string;
      cpuTime: number;
    }
  | {
      status: 'RE';
      output: string;
      cpuTime: number;
      errorValue: string;
      errorName: string;
    }
  | {
      status: 'TLE';
      output: string;
      cpuTime: number | null; // null if killed
    };

export class JudgeError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class JudgeKernelNotConnectedError extends JudgeError {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class JudgeKernelImplementationError extends JudgeError {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class JudgeKernelReconnectingFailedError extends JudgeError {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationFailedError extends JudgeError {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export namespace JudgePanel {
  export interface IOptions {
    editorServices: IEditorServices;
    editorConfig: Pick<CodeEditor.IOptions, 'config'>;
    rendermime: IRenderMimeRegistry;
    context: DocumentRegistry.IContext<JudgeModel>;
    translator: ITranslator;
    sessionContextDialogs: ISessionContextDialogs;
    submitted: Signal<any, JudgeSignal.ISubmissionArgs>;
    executed: Signal<any, JudgeSignal.IExecutionArgs>;

    judgeSubmissionAreaFactory: (
      options: JudgeSubmissionArea.IOptions
    ) => Widget;
    judgeTerminalFactory: (
      options: JudgeTerminal.IOptions
    ) => JudgeTerminal.IJudgeTerminal;
    submissionListFactory: (options: SubmissionList.IOptions) => JSX.Element;
    controlButtonFactory: (props: IControlButtonProps) => JSX.Element;
  }
}

export class JudgePanel extends BoxPanel {
  constructor(options: JudgePanel.IOptions) {
    super();
    this.addClass('jp-JudgePanel');

    this._context = options.context;
    this._translator = options.translator;
    this._sessionContextDialogs = options.sessionContextDialogs;
    this._trans = this._translator.load(TRANSLATOR_DOMAIN);
    this._submitted = options.submitted;
    this._executed = options.executed;
    this._rendermime = options.rendermime;

    this.id = 'jce-judge-panel';
    this.title.closable = true;

    const splitPanel = new SplitPanel({ spacing: 0 });
    splitPanel.addClass('jp-JudgePanel-splitPanel');

    this._editorWidget = new CodeEditorWrapper({
      model: this.model.codeModel,
      factory: options.editorServices.factoryService.newInlineEditor,
      editorOptions: { config: { ...options.editorConfig, lineNumbers: true } }
    });
    this._editorWidget.addClass('jp-JudgePanel-editor');
    this._editorWidget.node.setAttribute('data-jp-undoer', 'true'); // Activate undo/redo keybindings
    this._editorWidget.node.setAttribute('data-jp-code-runner', 'true'); // Activate run-code keybinding

    const problemPanel = this.createProblemPanel();
    problemPanel.renderProblem();
    this.model.problemChanged.connect((sender, problem) => {
      problemPanel.renderProblem();
      if (problem?.title) {
        this.title.label = `${problem?.title}.judge`;
      }
    });

    this._terminal = options.judgeTerminalFactory({
      panel: this,
      model: this.model.outputAreaModel,
      rendermime: options.rendermime,
      translator: this._translator
    });
    this._terminal.addClass('jp-JudgePanel-terminal');

    const submissionPanel: Widget = options.judgeSubmissionAreaFactory({
      panel: this,
      model: this.model,
      translator: this._translator,
      submissionListFactory: options.submissionListFactory,
      controlButtonFactory: options.controlButtonFactory
    });
    submissionPanel.addClass('jp-JudgePanel-submissionPanel');

    splitPanel.addWidget(problemPanel);

    const rightPanel = new SplitPanel({ orientation: 'vertical', spacing: 0 });
    rightPanel.addClass('jp-JudgePanel-rightPanel');
    rightPanel.addWidget(this._editorWidget);
    rightPanel.addWidget(this._terminal);
    rightPanel.addWidget(submissionPanel);

    splitPanel.addWidget(rightPanel);

    this.addWidget(splitPanel);

    if (!this.session.isReady) {
      void this.session.initialize();
    }
  }

  get model(): JudgeModel {
    return this.context.model;
  }

  get editor(): CodeEditor.IEditor {
    return this._editorWidget.editor;
  }

  get session(): ISessionContext {
    return this.context.sessionContext;
  }

  get context(): DocumentRegistry.IContext<JudgeModel> {
    return this._context;
  }

  createProblemPanel(): IJudgeProblemPanel {
    return new JudgeProblemPanel(
      {
        model: this.model,
        translator: this._translator
      },
      this._rendermime
    );
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the widget's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (!this.model) {
      return;
    }
    switch (event.type) {
      case 'mousedown':
        this._ensureFocus();
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    const node = this.node;
    node.addEventListener('mousedown', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._ensureFocus();
  }

  /**
   * Ensure that the widget has focus.
   */
  private _ensureFocus(): void {
    if (this.session.pendingInput) {
      // TODO Input을 활성화합니다.
    } else {
      if (!this.editor.hasFocus()) {
        this.editor.focus();
      }
    }
  }

  public async execute(): Promise<KernelMessage.IExecuteReplyMsg | null> {
    if (this.session.pendingInput) {
      void showDialog({
        title: this._trans.__('Cell not executed due to pending input'),
        body: this._trans.__(
          'The cell has not been executed to avoid kernel deadlock as there is another pending input! Submit your pending input and try again.'
        ),
        buttons: [Dialog.okButton({ label: this._trans.__('Ok') })]
      });
      return null;
    }

    if (this.session.hasNoKernel) {
      const shouldSelect = await this.session.startKernel();
      if (shouldSelect) {
        await this._sessionContextDialogs.selectKernel(this.session);
      }
    }

    if (this.session.hasNoKernel) {
      void showDialog({
        title: this._trans.__('Cell not executed due to missing kernel'),
        body: this._trans.__(
          'The cell has not been executed because no kernel selected. Please select a kernel to execute the cell.'
        ),
        buttons: [Dialog.okButton({ label: this._trans.__('Ok') })]
      });
      return null;
    }

    let reply: KernelMessage.IExecuteReplyMsg | undefined = undefined;
    try {
      const code = this.model.source;
      reply = await OutputArea.execute(
        code,
        this._terminal.outputArea,
        this.session,
        {}
      );

      let success = false;
      if (!reply || reply.content.status === 'ok') {
        success = true;
      }
      this._executed.emit({
        widget: this,
        cell: this.model.codeModel,
        success
      });
    } catch (e) {
      if (
        e instanceof Error &&
        e.message ===
          'Canceled future for execute_request message before replies were done'
      ) {
        // User canceled the execution. Do nothing.
      } else {
        throw e;
      }
    }

    // Restarts after the execution, cleaning up the kernel state.
    // It offers better ux, because users don't have to wait for the kernel to be ready.
    await this.session.restartKernel();

    return reply || null;
  }

  // This is called by command
  public async judge(): Promise<void> {
    const problem = this.model.problem;
    const code = this.model.source;

    if (problem === null) {
      throw new Error('Problem cannot be found.');
    }

    this.model.submissionStatus = {
      type: 'progress',
      runCount: 0,
      totalCount: 0
    };

    const testCases = await this.model.getTestCases();
    if (testCases.length === 0) {
      this.model.submissionStatus = {
        type: 'error',
        errorDetails: this._trans.__('Problem has no test cases.')
      };
      return;
    }

    const oldKernel = this.session.session?.kernel;
    if (!oldKernel) {
      void this._sessionContextDialogs.selectKernel(this.session);
      this.model.submissionStatus = { type: 'idle' };
      return;
    }

    const sessionContext = new SessionContext({
      sessionManager: this.session.sessionManager,
      specsManager: this.session.specsManager,
      name: 'Judge'
    });

    await sessionContext.initialize();
    await sessionContext.changeKernel(await oldKernel.spec);

    const kernel = sessionContext.session?.kernel;
    if (!kernel) {
      void this._sessionContextDialogs.selectKernel(sessionContext);
      this.model.submissionStatus = { type: 'idle' };
      return;
    }

    this.model.submissionStatus = {
      type: 'progress',
      runCount: 0,
      totalCount: testCases.length
    };

    // Wait until kernelDisplayStatus is idle
    // Check every second up to 20s
    // Just uses busy loop, no signal
    for (let i = 0; i < 20; i++) {
      if (sessionContext.kernelDisplayStatus === 'idle') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (sessionContext.kernelDisplayStatus !== 'idle') {
      // Many issues have been reported here
      if (sessionContext.kernelDisplayStatus === 'connecting') {
        // Network problem:
        // Allow undefined reconnectAttempt, for custom or unexpected IKernelConnection implementation
        const reconnectAttempt: number | undefined = (kernel as any)
          ._reconnectAttempt;

        if (reconnectAttempt === undefined) {
          // This case must be reported
          throw new JudgeKernelImplementationError(
            this._trans.__(
              'Kernel is still connecting. Please check your network.'
            )
          );
        } else if (reconnectAttempt > 0) {
          // This have some chance to be a server side problem
          throw new JudgeKernelReconnectingFailedError(
            this._trans.__(
              'Kernel is still connecting. Please check your network.'
            )
          );
        } else if (reconnectAttempt === 0) {
          // This is likely a client side network problem
          throw new JudgeKernelNotConnectedError(
            this._trans.__(
              'Kernel is still connecting. Please check your network.'
            )
          );
        }
      } else {
        // Kernel problem
        console.warn(
          `Kernel is still ${sessionContext.kernelDisplayStatus} after 20s`
        );
        throw new JudgeError(
          this._trans.__('Kernel is not responding. Please try again.')
        );
      }
    }

    const results: IRunResult[] = [];
    for (const testCase of testCases) {
      const result = await this.runWithInput(kernel, code, problem, testCase);
      results.push(result);
      this.model.submissionStatus = {
        type: 'progress',
        runCount: results.length,
        totalCount: testCases.length
      };
    }

    const validateResult = await this.model.validate(
      results.map(result => result.output)
    );

    if (validateResult === null) {
      throw new ValidationFailedError(
        this._trans.__('Validation failed. Please try again')
      );
    }

    await kernel.shutdown();
    kernel.dispose();

    const submission = await this.model.submit(
      {
        problemId: problem.id,
        code,
        token: validateResult.token,
        language: 'python',
        details: results.map((result, index) => {
          switch (result.status) {
            case 'OK':
              if (validateResult.results[index]) {
                return {
                  status: 'AC',
                  cpuTime: result.cpuTime,
                  memory: 0
                };
              } else {
                return {
                  status: 'WA',
                  answer: result.output,
                  cpuTime: result.cpuTime,
                  memory: 0
                };
              }
            case 'TLE':
              return {
                status: 'TLE',
                cpuTime: result.cpuTime,
                memory: 0
              };
            case 'OLE':
              return {
                status: 'OLE',
                cpuTime: result.cpuTime,
                memory: 0
              };
            case 'RE':
              return {
                status: 'RE',
                memory: 0,
                cpuTime: result.cpuTime,
                errorName: result.errorName,
                errorValue: result.errorValue
              };
          }
        })
      },
      this
    );

    this.model.submissionStatus = { type: 'idle' };

    this._submitted.emit({
      widget: this,
      submission,
      problem
    });
  }

  private async runWithInput(
    kernel: IKernelConnection,
    code: string,
    problem: ProblemProvider.IProblem,
    input: string
  ): Promise<IRunResult> {
    // Transfer inputs to python kernel first,
    // and then run the code with timeout.

    // Step 1: Override input function
    //         Prepare StringIO for input
    const prepareInput = `
import io
import base64

def input(prompt=None):  	
    r = JUDGE_INPUT_STRING_IO.${
      problem.inputTransferType === 'one_line' ? 'readline' : 'read'
    }().rstrip('\\n')
    if not r:  		
        return ''
    return r

JUDGE_INPUT_STRING_IO = io.StringIO()
`;
    await kernel.requestExecute(
      {
        code: prepareInput,
        stop_on_error: true
      },
      true,
      {}
    ).done;

    // Step 2: Push input to StringIO
    //         Encode input to base64 (to avoid escape problem)
    //         Divide input to chunks (1MB)
    const CHUNK_SIZE = 1000000;
    for (let i = 0; i < input.length; i += CHUNK_SIZE) {
      const chunk = input.slice(i, i + CHUNK_SIZE);
      const uint8array = new TextEncoder().encode(chunk);
      const base64EncodedInput = bytesToBase64(uint8array);
      const pushInput = `
JUDGE_INPUT_STRING_IO.write(base64.b64decode('${base64EncodedInput}').decode("utf-8"))
`;
      await kernel.requestExecute(
        {
          code: pushInput,
          stop_on_error: true
        },
        true,
        {}
      ).done;
    }

    // Step 3: Seek to the beginning of StringIO
    //         This code is prepended to the user code
    const seekInput = `
JUDGE_INPUT_STRING_IO.seek(0)
`;

    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code: seekInput + code,
      stop_on_error: true,
      allow_stdin: true
    };

    const startTime = Date.now();
    const future = kernel.requestExecute(content, true, {});

    let result: IRunResult = { output: '', status: 'OK', cpuTime: 0 };
    future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
      const msgType = msg.header.msg_type;

      switch (msgType) {
        case 'stream': {
          const msgStream = msg as IStreamMsg;
          if (msgStream.content.name === 'stdout') {
            result.output = result.output.concat(msgStream.content.text);
          }
          break;
        }
        case 'error': {
          const msgError = msg as IErrorMsg;
          result = {
            status: 'RE',
            errorName: msgError.content.ename,
            errorValue: msgError.content.evalue,
            output: result.output,
            cpuTime: 0
          };
          break;
        }
        case 'execute_result':
        case 'display_data':
        case 'clear_output':
        case 'update_display_data':
        default:
          break;
      }
    };

    const timelimit = 1000 * problem.timeout;

    const timeout = new Promise<number>(resolve => {
      // 강제로 종료하는 것은 20% 여유를 두고 진행합니다.
      setTimeout(() => {
        resolve(0);
      }, timelimit * 1.2);
    });
    const a = await Promise.race([future.done, timeout]);
    if (a === 0) {
      future.dispose();
      await kernel.interrupt();

      // 강제 종료는 당연히 TLE
      // result.status = 'TLE';
      result = {
        status: 'TLE',
        output: result.output,
        cpuTime: null
      };
    } else {
      // 강제 종료가 아니더라도 TLE 일 수 있습니다.
      // 우리가 시간을 산정하고, TLE를 부여하는 것은 이 cpuTime 기준입니다.
      // 위에서 setTimeout을 하는 것은 다만 커널을 강제종료하기 위한 기준입니다.
      // cpuTime 언제나 0보다 크고 timelimit 이하인 값입니다.
      const cpuTime = Date.now() - startTime;
      result.cpuTime = cpuTime;
      if (cpuTime > timelimit) {
        result = {
          status: 'TLE',
          output: result.output,
          cpuTime: cpuTime
        };
      }
    }

    return result;
  }

  private _context: DocumentRegistry.IContext<JudgeModel>;

  private _editorWidget: CodeEditorWrapper;
  private _rendermime: IRenderMimeRegistry;
  private _terminal: JudgeTerminal.IJudgeTerminal;

  protected _translator: ITranslator;
  private _sessionContextDialogs: ISessionContextDialogs;
  private _trans: TranslationBundle;
  private _submitted: Signal<any, JudgeSignal.ISubmissionArgs>;
  private _executed: Signal<any, JudgeSignal.IExecutionArgs>;
}

export class JudgeDocument extends DocumentWidget<JudgePanel, JudgeModel> {
  constructor(
    options: DocumentWidget.IOptions<JudgePanel, JudgeModel> & {
      commands: CommandRegistry;
      translator: ITranslator;
    }
  ) {
    super(options);

    ToolbarItems.getDefaultItems(this.content, options.translator).forEach(
      value => {
        this.toolbar.addItem(value.name, value.widget);
      }
    );
  }
}

/**
 * A widget factory for editors.
 */
export class JudgeDocumentFactory extends ABCWidgetFactory<
  JudgeDocument,
  JudgeModel
> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: JudgeDocumentFactory.IOptions) {
    super(options.factoryOptions);
    this._editorServices = options.editorServices;
    this._rendermime = options.rendermime;
    this._commands = options.commands;
    this._editorConfig = options.editorConfig;
    this._sessionContextDialogs = options.sessionContextDialogs;
    this._judgePanelFactory = options.judgePanelFactory;
    this._judgeSubmissionAreaFactory = options.judgeSubmissionAreaFactory;
    this._judgeTerminalFactory = options.judgeTerminalFactory;
    this._submissionListFactory = options.submissionListFactory;
    this._controlButtonFactory = options.controlButtonFactory;
    this._submitted = options.submitted;
    this._executed = options.executed;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<JudgeModel>
  ): JudgeDocument {
    const judgePanel = this._judgePanelFactory({
      rendermime: this._rendermime,
      editorServices: this._editorServices,
      editorConfig: this._editorConfig,
      context,
      translator: this.translator,
      sessionContextDialogs: this._sessionContextDialogs,
      submitted: this._submitted,
      executed: this._executed,
      judgeSubmissionAreaFactory: this._judgeSubmissionAreaFactory,
      judgeTerminalFactory: this._judgeTerminalFactory,
      submissionListFactory: this._submissionListFactory,
      controlButtonFactory: this._controlButtonFactory
    });

    judgePanel.title.icon = JudgeColorLabIcon;
    const widget = new JudgeDocument({
      content: judgePanel,
      context,
      commands: this._commands,
      translator: this.translator
    });
    return widget;
  }

  private _editorServices: IEditorServices;
  private _rendermime: IRenderMimeRegistry;
  private _commands: CommandRegistry;
  private _editorConfig: Pick<CodeEditor.IOptions, 'config'>;
  private _sessionContextDialogs: ISessionContextDialogs;
  private _judgePanelFactory: (options: JudgePanel.IOptions) => JudgePanel;
  private _judgeSubmissionAreaFactory: (
    options: JudgeSubmissionArea.IOptions
  ) => Widget;
  private _judgeTerminalFactory: (
    options: JudgeTerminal.IOptions
  ) => JudgeTerminal.IJudgeTerminal;
  private _submissionListFactory: (
    options: SubmissionList.IOptions
  ) => JSX.Element;
  private _controlButtonFactory: (props: IControlButtonProps) => JSX.Element;
  private _submitted: Signal<any, JudgeSignal.ISubmissionArgs>;
  private _executed: Signal<any, JudgeSignal.IExecutionArgs>;
}

/**
 * The namespace for `JudgeDocumentFactory` class statics.
 */
export namespace JudgeDocumentFactory {
  /**
   * The options used to create an editor widget factory.
   */
  export interface IOptions {
    editorServices: IEditorServices;
    rendermime: IRenderMimeRegistry;
    commands: CommandRegistry;
    editorConfig: Pick<CodeEditor.IOptions, 'config'>;
    sessionContextDialogs: ISessionContextDialogs;
    /**
     * The factory options associated with the factory.
     */
    factoryOptions: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<JudgePanel>
    >;

    judgePanelFactory: (options: JudgePanel.IOptions) => JudgePanel;
    judgeSubmissionAreaFactory: (
      options: JudgeSubmissionArea.IOptions
    ) => Widget;
    judgeTerminalFactory: (
      options: JudgeTerminal.IOptions
    ) => JudgeTerminal.IJudgeTerminal;
    submissionListFactory: (options: SubmissionList.IOptions) => JSX.Element;
    controlButtonFactory: (props: IControlButtonProps) => JSX.Element;
    submitted: Signal<any, JudgeSignal.ISubmissionArgs>;
    executed: Signal<any, JudgeSignal.IExecutionArgs>;
  }
}
