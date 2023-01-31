import {
  Dialog,
  ISessionContext,
  SessionContext,
  sessionContextDialogs,
  showDialog
} from '@jupyterlab/apputils';
import { Message } from '@lumino/messaging';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { Panel } from '@lumino/widgets';
import { textEditorIcon } from '@jupyterlab/ui-components';
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
import {
  IRenderMime,
  IRenderMimeRegistry,
  MimeModel
} from '@jupyterlab/rendermime';
import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';
import { CommandRegistry } from '@lumino/commands';
import { OutputArea } from '@jupyterlab/outputarea';
import { KernelMessage } from '@jupyterlab/services';
import { IHeader, IStreamMsg } from '@jupyterlab/services/lib/kernel/messages';
import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';
import { JudgeModel } from '../model';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { IPropertyInspector } from '@jupyterlab/property-inspector';
import { NoPromptOutputArea } from './NoPromptOutputArea';
import { ToolbarItems } from '../toolbar';
import { TRANSLATOR_DOMAIN } from '../constants';
import { IJudgePanelFactory } from '../tokens';

/**
 * The class name added to the panels.
 */
const PANEL_CLASS = 'jp-JudgePanel';

interface RunResult {
  status: 'OK' | 'TLE' | 'OLE' | 'RE';
  output: string;
  cpuTime: number;
}

export namespace JudgePanel {
  export interface IOptions {
    editorConfig: Partial<CodeEditor.IConfig>;
    rendermime: IRenderMimeRegistry;
    context: DocumentRegistry.IContext<JudgeModel>;
    translator: ITranslator;
  }
}

export class JudgePanel extends Panel {
  constructor(options: JudgePanel.IOptions) {
    super();
    this._context = options.context;
    this._translator = options.translator;
    this._trans = this._translator.load(TRANSLATOR_DOMAIN);

    this.addClass(PANEL_CLASS);
    this.id = 'jce-judge-panel';
    this.title.label = this._trans.__('Judge');
    this.title.closable = true;

    const editorOptions = {
      model: this.model.codeModel,
      factory: new CodeMirrorEditorFactory({
        scrollbarStyle: 'null'
      }).newInlineEditor,
      config: { ...options.editorConfig, lineNumbers: true }
    };
    this._editorWidget = new CodeEditorWrapper(editorOptions);

    this._markdownRenderer = options.rendermime.createRenderer('text/markdown');
    this.renderProblem();
    this.model.problemChanged.connect((sender, _) => {
      this.renderProblem();
    });

    this._outputArea = new NoPromptOutputArea({
      model: this.model.outputAreaModel,
      rendermime: options.rendermime
    });

    this.addWidget(this._markdownRenderer);
    this.addWidget(this._editorWidget);
    this.addWidget(this._outputArea);

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

  renderProblem() {
    this._markdownRenderer.renderModel(
      new MimeModel({
        data: {
          // 문제를 불러오지 못했습니다.
          ['text/markdown']:
            this.model.problem?.content ??
            this._trans.__('Problem Not Available.')
        }
      })
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
    if (this.session.hasNoKernel) {
      void sessionContextDialogs.selectKernel(this.session);
      return null;
    }

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

    const code = this.model.source;
    const reply = await OutputArea.execute(
      code,
      this._outputArea,
      this.session,
      {}
    );

    return reply || null;
  }

  // This is called by command
  public async judge(): Promise<void> {
    const problem = this.model.problem;

    if (problem === null) {
      throw new Error('Problem cannot be found.');
    }

    const oldKernel = this.session.session?.kernel;
    if (!oldKernel) {
      void sessionContextDialogs.selectKernel(this.session);
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
      void sessionContextDialogs.selectKernel(sessionContext);
      return;
    }

    const testCases = await this.model.getTestCases();
    const results: RunResult[] = [];

    this.model.submissionStatus = {
      inProgress: true,
      runCount: 0,
      totalCount: testCases.length
    };

    this.showPropertyInspectorPanel();

    for (let testCase of testCases) {
      const result = await this.runWithInput(kernel, problem, testCase);
      results.push(result);
      this.model.submissionStatus = {
        inProgress: true,
        runCount: results.length,
        totalCount: testCases.length
      };
    }

    let status: ProblemProvider.SubmissionStatus | null = null;
    const validateResult = await this.model.validate(
      results.map(result => result.output)
    );
    if (validateResult.acceptedCount === validateResult.totalCount) {
      status = 'AC';
    } else if (results.some(result => result.status == 'RE')) {
      status = 'RE';
    } else if (results.some(result => result.status == 'OLE')) {
      status = 'OLE';
    } else if (results.some(result => result.status == 'TLE')) {
      status = 'TLE';
    } else {
      status = 'WA';
    }

    await kernel.shutdown();
    kernel.dispose();

    await this.model.submit({
      problemId: problem.id,
      status: status,
      code: this.model.source,
      cpuTime:
        results.map(result => result.cpuTime).reduce((a, b) => a + b, 0) /
        results.length,
      acceptedCount: validateResult.acceptedCount,
      totalCount: validateResult.totalCount,
      token: validateResult.token,
      language: 'python',
      memory: 0
    });

    this.model.submissionStatus = {
      inProgress: false,
      runCount: 0,
      totalCount: 0
    };
  }

  public showPropertyInspectorPanel() {
    if (this.propertyInspector) {
      this.propertyInspector.showPanel();
    }
  }

  private async runWithInput(
    kernel: IKernelConnection,
    problem: ProblemProvider.IProblem,
    input: string,
    restartKernel: boolean = false
  ): Promise<RunResult> {
    const code = this.model.source;

    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code,
      stop_on_error: true,
      allow_stdin: true
    };

    if (restartKernel) {
      await kernel.restart();
    }

    // TODO 최대 대기 시간 정의
    const waitIdleState = new Promise<void>((resolve, reject) => {
      const resolveOnIdleState = (
        sender: IKernelConnection,
        state: KernelMessage.Status
      ) => {
        if (state === 'idle') {
          kernel.statusChanged.disconnect(resolveOnIdleState);
          resolve();
        }
      };
      if (kernel.status === 'idle') {
        resolve();
      } else {
        kernel.statusChanged.connect(resolveOnIdleState);
      }
    });
    await waitIdleState;

    let inputLinesLeft: string[] = [];
    if (problem.inputTransferType === 'one_line') {
      inputLinesLeft = input.split(/\r?\n/);
    } else {
      inputLinesLeft = [input];
    }

    const startTime = Date.now();
    const future = kernel.requestExecute(content, true, {});
    future.onStdin = (
      msg: KernelMessage.IStdinMessage<KernelMessage.StdinMessageType>
    ) => {
      if (msg.header.msg_type == 'input_request') {
        const currentInputLine = inputLinesLeft.shift();
        future.sendInputReply(
          {
            value: currentInputLine ?? '',
            status: 'ok'
          },
          msg.header as IHeader<'input_request'>
        );
      }
    };

    let result: RunResult = { output: '', status: 'OK', cpuTime: 0 };
    future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
      const msgType = msg.header.msg_type;

      switch (msgType) {
        case 'stream':
          const msgStream = msg as IStreamMsg;
          if (msgStream.content.name === 'stdout') {
            result.output = result.output.concat(msgStream.content.text);
          }
          break;
        case 'error':
          result.status = 'RE';
          break;
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
      result.status = 'TLE';
    } else {
      // 강제 종료가 아니더라도 TLE 일 수 있습니다.
      // 우리가 시간을 산정하고, TLE를 부여하는 것은 이 cpuTime 기준입니다.
      // 위에서 setTimeout을 하는 것은 다만 커널을 강제종료하기 위한 기준입니다.
      // cpuTime 언제나 0보다 크고 timelimit 이하인 값입니다.
      const cpuTime = Date.now() - startTime;
      if (cpuTime > timelimit) {
        result.status = 'TLE';
      } else {
        result.cpuTime = cpuTime;
      }
    }

    return result;
  }

  private _context: DocumentRegistry.IContext<JudgeModel>;

  private _editorWidget: CodeEditorWrapper;
  private _markdownRenderer: IRenderMime.IRenderer;
  private _outputArea: OutputArea;
  public propertyInspector: IPropertyInspector | null = null;

  private _translator: ITranslator;
  private _trans: TranslationBundle;
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
    this._rendermime = options.rendermime;
    this._commands = options.commands;
    this._editorConfig = options.editorConfig;
    this._judgePanelFactory = options.judgePanelFactory;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<JudgeModel>
  ): JudgeDocument {
    const judgePanel = this._judgePanelFactory.create({
      rendermime: this._rendermime,
      editorConfig: this._editorConfig,
      context,
      translator: this.translator
    });

    judgePanel.title.icon = textEditorIcon;
    const widget = new JudgeDocument({
      content: judgePanel,
      context,
      commands: this._commands,
      translator: this.translator
    });
    return widget;
  }

  private _rendermime: IRenderMimeRegistry;
  private _commands: CommandRegistry;
  private _editorConfig: Partial<CodeEditor.IConfig>;
  private _judgePanelFactory: IJudgePanelFactory;
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
    editorConfig: Partial<CodeEditor.IConfig>;
    /**
     * The factory options associated with the factory.
     */
    factoryOptions: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<JudgePanel>
    >;

    judgePanelFactory: IJudgePanelFactory;
  }
}
