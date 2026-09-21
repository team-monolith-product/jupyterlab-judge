// 참조: https://github.com/jupyterlab/jupyterlab/blob/62e0591922e3ec8393af7a1e17c8d5438ece22f9/packages/fileeditor-extension/src/commands.ts
import { TranslationBundle } from '@jupyterlab/translation';
import { WidgetTracker } from '@jupyterlab/apputils';
import { JudgeDocument } from './widgets/JudgePanel';
import { CommandRegistry } from '@lumino/commands';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ServerConnection } from '@jupyterlab/services';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { JudgeModel } from './model';
import { JUDGE_HIDDEN_FOLDER_NAME, PLUGIN_ID } from './constants';
import { IProblemProvider } from './tokens';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { opened } from './judgeSignal';
import { PathExt } from '@jupyterlab/coreutils';

/**
 * The command IDs used by the fileeditor plugin.
 */
export namespace CommandIDs {
  export const open = `${PLUGIN_ID}:plugin:open`;
  export const openOrCreateFromId = `${PLUGIN_ID}:plugin:open-or-create-from-id`;
  export const execute = `${PLUGIN_ID}:plugin:execute`;

  export const undo = `${PLUGIN_ID}:plugin:undo`;
  export const redo = `${PLUGIN_ID}:plugin:redo`;

  export const run = `${PLUGIN_ID}:plugin:run`;
  export const runAll = `${PLUGIN_ID}:plugin:run-all`;
}

/**
 * Wrapper function for adding the default File Editor commands
 */
export function addCommands(
  commands: CommandRegistry,
  trans: TranslationBundle,
  docManager: IDocumentManager,
  tracker: WidgetTracker<JudgeDocument>,
  problemProvider: IProblemProvider
): void {
  commands.addCommand(CommandIDs.open, {
    execute: async (args: any) => {
      docManager.openOrReveal(args.path);
    },
    label: trans.__('Open Judge')
  });

  commands.addCommand(CommandIDs.openOrCreateFromId, {
    execute: async args => {
      if (args.problemId) {
        await openOrCreateFromId(
          problemProvider,
          docManager,
          args.problemId as string,
          args.judgeRoot as string | undefined
        );
      }
    },
    label: trans.__('Open or Create Judge From Id')
  });

  commands.addCommand(CommandIDs.execute, {
    execute: async (args: any) => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute();
      }
    },
    label: trans.__('Execute')
  });

  commands.addCommand(CommandIDs.redo, {
    execute: async () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.editor.redo();
      }
    },
    label: trans.__('Redo')
  });

  commands.addCommand(CommandIDs.undo, {
    execute: async () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.editor.undo();
      }
    },
    label: trans.__('Undo')
  });

  commands.addCommand(CommandIDs.run, {
    execute: async () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute();
      }
    },
    label: trans.__('Run')
  });
  commands.addCommand(CommandIDs.runAll, {
    execute: async () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute();
      }
    },
    label: trans.__('Run All')
  });
}

export async function openOrCreateFromId(
  problemProvider: IProblemProvider,
  docManager: IDocumentManager,
  problemId: string,
  judgeRoot: string = JUDGE_HIDDEN_FOLDER_NAME
): Promise<IDocumentWidget | undefined> {
  const problem = await problemProvider.getProblem(problemId);
  if (problem) {
    const title = problem.title;
    const contents = docManager.services.contents;
    const driveName = contents.driveName(judgeRoot);
    const root = contents.localPath(judgeRoot);
    const globalPath = (localPath: string) =>
      driveName ? `${driveName}:${localPath}` : localPath;
    const directoryId = globalPath(PathExt.join(root, problemId));
    const path = globalPath(PathExt.join(root, problemId, `${title}.judge`));

    if (root) {
      await contents.save(globalPath(root), {
        name: PathExt.basename(root),
        type: 'directory'
      });
    }
    await docManager.services.contents.save(directoryId, {
      name: problemId,
      type: 'directory'
    });
    return openOrCreate(problemProvider, docManager, path, problemId);
  }
}

async function openOrCreate(
  problemProvider: IProblemProvider,
  docManager: IDocumentManager,
  path: string,
  problemId: string
): Promise<IDocumentWidget | undefined> {
  try {
    await docManager.services.contents.get(path);
  } catch (e: any) {
    if (
      e instanceof ServerConnection.ResponseError &&
      e.response.status === 404
    ) {
      await docManager.services.contents.save(path, {
        name: PathExt.basename(path),
        type: 'file',
        format: 'text',
        content: await JudgeModel.newFileContent(problemProvider, problemId)
      });
    } else {
      throw e;
    }
  }
  opened.emit({ problemId });
  return docManager.openOrReveal(path);
}

/**
 * Wrapper function for adding the default menu items for Judge
 */
export function addMenuItems(
  menu: IMainMenu,
  tracker: WidgetTracker<JudgeDocument>,
  trans: TranslationBundle
): void {
  addUndoRedoToEditMenu(menu);
  addCodeRunnerToRunMenu(menu);
}

/**
 * Add Judge undo and redo widgets to the Edit menu
 */
export function addUndoRedoToEditMenu(menu: IMainMenu): void {
  menu.editMenu.undoers.undo.add({
    id: CommandIDs.undo,
    isEnabled: widget => {
      return widget instanceof JudgeDocument;
    }
  });
  menu.editMenu.undoers.redo.add({
    id: CommandIDs.redo,
    isEnabled: widget => {
      return widget instanceof JudgeDocument;
    }
  });
}

/**
 * Add Judge run widgets to the Run menu
 */
export function addCodeRunnerToRunMenu(menu: IMainMenu): void {
  menu.runMenu.codeRunners.run.add({
    id: CommandIDs.run,
    isEnabled: widget => {
      return widget instanceof JudgeDocument;
    }
  });
  menu.runMenu.codeRunners.runAll.add({
    id: CommandIDs.runAll,
    isEnabled: widget => {
      return widget instanceof JudgeDocument;
    }
  });
}
