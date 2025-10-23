import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';
import { SubmissionList } from './components/SubmissionList';
import { PLUGIN_ID } from './constants';
import { ProblemProvider } from './problemProvider/problemProvider';
import { JudgePanel } from './widgets/JudgePanel';
import { JudgeSubmissionArea } from './widgets/JudgeSubmissionArea';
import { JudgeTerminal } from './widgets/JudgeTerminal';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IControlButtonProps } from './components';

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
    outputs: (string | null)[]
  ): Promise<ProblemProvider.IValidateResult | null>;
  getSubmissions(id: string): Promise<ProblemProvider.ISubmission[]>;
  submit(
    request: ProblemProvider.ISubmissionRequest,
    panel: JudgePanel
  ): Promise<ProblemProvider.ISubmission>;
}

export const IJudgePanelFactory = new Token<IJudgePanelFactory>(
  `${PLUGIN_ID}:IJudgePanelFactory`
);

export type IJudgePanelFactory = (options: JudgePanel.IOptions) => JudgePanel;

export const IJudgeSubmissionAreaFactory =
  new Token<IJudgeSubmissionAreaFactory>(
    `${PLUGIN_ID}:IJudgeSubmissionAreaFactory`
  );

export type IJudgeSubmissionAreaFactory = (
  options: JudgeSubmissionArea.IOptions
) => Widget;

export const IJudgeTerminalFactory = new Token<IJudgeTerminalFactory>(
  `${PLUGIN_ID}:IJudgeTerminalFactory`
);

export type IJudgeTerminalFactory = (
  options: JudgeTerminal.IOptions
) => JudgeTerminal.IJudgeTerminal;

export const ISubmissionListFactory = new Token<ISubmissionListFactory>(
  `${PLUGIN_ID}:ISubmissionListFactory`
);

export type ISubmissionListFactory = (
  options: SubmissionList.IOptions
) => JSX.Element;

export const IControlButtonFactory = new Token<IControlButtonFactory>(
  `${PLUGIN_ID}:IControlButtonFactory`
);

export type IControlButtonFactory =
  | ((props: IControlButtonProps) => JSX.Element)
  | null;

export const IJudgeSignal = new Token<IJudgeSignal>(
  `${PLUGIN_ID}:IJudgeSignal`
);

export interface IJudgeSignal {
  readonly submitted: ISignal<any, JudgeSignal.ISubmissionArgs>;
  readonly executed: ISignal<any, JudgeSignal.IExecutionArgs>;
}

export namespace JudgeSignal {
  export interface ISubmissionArgs {
    widget: JudgePanel;
    problem: ProblemProvider.IProblem;
    submission: ProblemProvider.ISubmission;
  }

  export interface IExecutionArgs {
    widget: JudgePanel;
    cell: CodeEditor.IModel;
    success: boolean;
  }
}
