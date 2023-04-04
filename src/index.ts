import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { ITranslator } from '@jupyterlab/translation';
import {
  JudgeDocument,
  JudgeDocumentFactory,
  JudgePanel
} from './widgets/JudgePanel';
import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';
import { addCommands, addMenuItems, CommandIDs } from './commands';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IMainMenu } from '@jupyterlab/mainmenu';
import {
  BROWSER_NAME,
  DRIVE_NAME,
  PLUGIN_ID,
  TRANSLATOR_DOMAIN
} from './constants';
import { Drive } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { JSONObject } from '@lumino/coreutils';
import { JudgeModel } from './model';
import {
  IJudgePanelFactory,
  IJudgeSignal,
  IJudgeSubmissionAreaFactory,
  IJudgeTerminalFactory,
  IProblemProvider,
  ISubmissionListFactory
} from './tokens';
import { HardCodedProblemProvider } from './problemProvider/HardCodedProblemProvider';
import { ProblemProvider } from './problemProvider/problemProvider';
import { Signal } from '@lumino/signaling';
import { JudgeSubmissionArea } from './widgets/JudgeSubmissionArea';
import { JudgeTerminal } from './widgets/JudgeTerminal';
import { SubmissionListImpl } from './components/SubmissionList';

/**
 * A signal that emits whenever a submission is submitted.
 */
const submitted = new Signal<
  any,
  {
    widget: JudgePanel;
    problem: ProblemProvider.IProblem;
    submission: ProblemProvider.ISubmission;
  }
>({});

const signal: JupyterFrontEndPlugin<IJudgeSignal> = {
  id: `${PLUGIN_ID}:IJudgeSignal`,
  provides: IJudgeSignal,
  activate: (_app: JupyterFrontEnd): IJudgeSignal => {
    return {
      get submitted() {
        return submitted;
      }
    };
  },
  autoStart: true
};

const problemProvider: JupyterFrontEndPlugin<IProblemProvider> = {
  id: `${PLUGIN_ID}:IProblemProvider`,
  provides: IProblemProvider,
  activate: (_app: JupyterFrontEnd): IProblemProvider => {
    return new HardCodedProblemProvider();
  },
  autoStart: true
};

const judgePanelFactory: JupyterFrontEndPlugin<IJudgePanelFactory> = {
  id: `${PLUGIN_ID}:IJudgePanelFactory`,
  provides: IJudgePanelFactory,
  activate: (_app: JupyterFrontEnd): IJudgePanelFactory => {
    return (options: JudgePanel.IOptions) => new JudgePanel(options);
  },
  autoStart: true
};

const judgeSubmissionAreaFactory: JupyterFrontEndPlugin<IJudgeSubmissionAreaFactory> =
  {
    id: `${PLUGIN_ID}:IJudgeSubmissionAreaFactory`,
    provides: IJudgeSubmissionAreaFactory,
    activate: (_app: JupyterFrontEnd): IJudgeSubmissionAreaFactory => {
      return (options: JudgeSubmissionArea.IOptions) =>
        new JudgeSubmissionArea(options);
    },
    autoStart: true
  };

const judgeTerminalFactory: JupyterFrontEndPlugin<IJudgeTerminalFactory> = {
  id: `${PLUGIN_ID}:IJudgeTerminalFactory`,
  provides: IJudgeTerminalFactory,
  activate: (_app: JupyterFrontEnd): IJudgeTerminalFactory => {
    return (options: JudgeTerminal.IOptions) => new JudgeTerminal(options);
  },
  autoStart: true
};

const submissionListFactory: JupyterFrontEndPlugin<ISubmissionListFactory> = {
  id: `${PLUGIN_ID}:ISubmissionListFactory`,
  provides: ISubmissionListFactory,
  activate: (_app: JupyterFrontEnd): ISubmissionListFactory => {
    return SubmissionListImpl;
  },
  autoStart: true
};

/**
 * Initialization data for the jupyterlab_judge extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: `${PLUGIN_ID}:plugin`,
  autoStart: true,
  requires: [
    IJudgePanelFactory,
    IJudgeSubmissionAreaFactory,
    IJudgeTerminalFactory,
    ISubmissionListFactory,
    IProblemProvider,
    ITranslator,
    IEditorServices,
    IRenderMimeRegistry,
    IDocumentManager,
    IFileBrowserFactory,
    IMainMenu,
    ICommandPalette
  ],
  optional: [ISettingRegistry, ILayoutRestorer],
  activate: async (
    app: JupyterFrontEnd,
    judgePanelFactory: IJudgePanelFactory,
    judgeSubmissionAreaFactory: IJudgeSubmissionAreaFactory,
    judgeTerminalFactory: IJudgeTerminalFactory,
    submissionListFactory: ISubmissionListFactory,
    problemProvider: IProblemProvider,
    translator: ITranslator,
    editorService: IEditorServices,
    rendermime: IRenderMimeRegistry,
    docManager: IDocumentManager,
    browserFactory: IFileBrowserFactory,
    menu: IMainMenu,
    palette: ICommandPalette,
    settingRegistry: ISettingRegistry | null,
    restorer: ILayoutRestorer | null
  ) => {
    const trans = translator.load(TRANSLATOR_DOMAIN);
    const namespace = 'judge';
    const tracker = new WidgetTracker<JudgeDocument>({
      namespace
    });
    const judgeDocumentFactoryName = trans.__('Judge');

    // 사용자가 노트북에 설정한 코드 셀 컨피그를 가져와 저지에 적용합니다.
    let editorConfig: Partial<CodeEditor.IConfig> | null = null;
    if (settingRegistry) {
      const settings = await settingRegistry.load(
        '@jupyterlab/notebook-extension:tracker'
      );
      const codeConfig = settings.get('codeCellConfig').composite as JSONObject;
      editorConfig = codeConfig;
    } else {
      editorConfig = {};
    }

    const widgetFactory = new JudgeDocumentFactory({
      editorServices: editorService,
      rendermime: rendermime,
      commands: app.commands,
      editorConfig: editorConfig,
      judgePanelFactory,
      judgeSubmissionAreaFactory,
      judgeTerminalFactory,
      submissionListFactory,
      submitted,
      factoryOptions: {
        name: judgeDocumentFactoryName,
        modelName: 'judge-model',
        fileTypes: ['judge'],
        defaultFor: ['judge'],
        preferKernel: true,
        canStartKernel: true,
        shutdownOnClose: true,
        translator: translator
      }
    });

    widgetFactory.widgetCreated.connect((sender, widget) => {
      // Notify the widget tracker if restore data needs to update.
      widget.context.pathChanged.connect(() => {
        void tracker.save(widget);
      });
      void tracker.add(widget);
    });
    app.docRegistry.addWidgetFactory(widgetFactory);

    app.docRegistry.addModelFactory(
      new JudgeModel.JudgeModelFactory({
        problemProviderFactory: () => problemProvider
      })
    );
    app.docRegistry.addFileType({
      name: 'judge',
      contentType: 'file',
      fileFormat: 'text',
      displayName: trans.__('Judge File'),
      extensions: ['.judge'],
      mimeTypes: ['text/json', 'application/json']
    });

    addCommands(app.commands, trans, docManager, tracker, problemProvider);
    addMenuItems(menu, tracker, trans);

    palette.addItem({
      command: CommandIDs.openOrCreateFromId,
      category: 'Judge',
      args: { problemId: '1' }
    });

    if (restorer) {
      void restorer.restore(tracker, {
        command: CommandIDs.open,
        args: widget => ({ path: widget.context.path }),
        name: widget => widget.context.path
      });
    }

    // 독립적인 Drive와 File Browser 를 생성합니다.
    // 이 Drive 경로로 접근되면 File Browser 에 영향을 주지 않습니다.
    // 기존 Drive 를 사용하는 경우 Judge 파일을 클릭하면 숨김 폴더가 열리는 문제가 있습니다.
    // https://www.notion.so/team-mono/UX-d07ce16254c64434b13712db5d042a4c
    app.serviceManager.contents.addDrive(new Drive({ name: DRIVE_NAME }));
    browserFactory.createFileBrowser(BROWSER_NAME, {
      driveName: DRIVE_NAME
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  plugin,
  problemProvider,
  judgePanelFactory,
  judgeSubmissionAreaFactory,
  judgeTerminalFactory,
  submissionListFactory,
  signal
];

export default plugins;

export * from './tokens';

export { openOrCreateFromId } from './commands';

export * from './widgets';
export * from './components';
export * from './problemProvider';
