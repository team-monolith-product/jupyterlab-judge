import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { PLUGIN_ID } from './constants';
import { ProblemProvider } from './problemProvider/problemProvider';
import { JudgePanel } from './widgets/JudgePanel';

/**
 * The Problem Provider token.
 */
export const IProblemProviderRegistry = new Token<IProblemProviderRegistry>(
  `${PLUGIN_ID}:IProblemProviderRegistry`
);

export interface IProblemProviderRegistry {
  register(provider: IProblemProvider): void;
}

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

export const IJudgePanelFactoryRegistry = new Token<IJudgePanelFactoryRegistry>(
  `${PLUGIN_ID}:IJudgePanelFactoryRegistry`
);

export interface IJudgePanelFactoryRegistry {
  register(factory: (options: JudgePanel.IOptions) => JudgePanel): void;
}

export const IJudgeSignal = new Token<IJudgeSignal>(
  `${PLUGIN_ID}:IJudgeSignal`
);

export interface IJudgeSignal {
  readonly submitted: ISignal<
    any,
    {
      widget: JudgePanel;
      problem: ProblemProvider.IProblem;
      submission: ProblemProvider.ISubmission;
    }
  >;
}
