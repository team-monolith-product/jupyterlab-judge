import { CodeEditor, IEditorServices } from '@jupyterlab/codeeditor';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ITranslator } from '@jupyterlab/translation';
import { Token } from '@lumino/coreutils';
import { PLUGIN_ID } from './constants';
import { JudgeModel } from './model';
import { ProblemProvider } from './problemProvider/problemProvider';
import { JudgePanel } from './widgets/JudgePanel';

/**
 * The Problem Provider token.
 */
export const IProblemProvider = new Token<IProblemProvider>(
  `${PLUGIN_ID}:IProblemProvider`
);

export interface IProblemProvider {
  getProblem(id: string): Promise<ProblemProvider.IProblem | null>;
  getTestCases(id: string): Promise<string[]>;
  validate(
    id: string,
    outputs: string[]
  ): Promise<ProblemProvider.IValidateResult>;
  getSubmissions(id: string): Promise<ProblemProvider.ISubmission[]>;
  submit(
    request: ProblemProvider.ISubmissionRequest
  ): Promise<ProblemProvider.ISubmission>;
}

export const IJudgePanelFactory = new Token<IJudgePanelFactory>(
  `${PLUGIN_ID}:IJudgePanelFactory`
);

export interface IJudgePanelFactory {
  create(options: IJudgePanelFactory.IOptions): JudgePanel;
}

export namespace IJudgePanelFactory {
  export interface IOptions {
    services: IEditorServices,
    editorConfig: Partial<CodeEditor.IConfig>,
    rendermime: IRenderMimeRegistry,
    context: DocumentRegistry.IContext<JudgeModel>,
    translator: ITranslator
  }
}
