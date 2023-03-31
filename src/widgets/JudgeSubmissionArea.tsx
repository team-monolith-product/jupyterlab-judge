import { ReactWidget } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SubmissionArea } from '../components/SubmissionArea';
import {
  SubmissionList,
  SubmissionListImpl
} from '../components/SubmissionList';
import { TRANSLATOR_DOMAIN } from '../constants';
import { JudgeModel } from '../model';
import { JudgePanel } from './JudgePanel';

export const transContext = React.createContext<TranslationBundle>(
  nullTranslator.load(TRANSLATOR_DOMAIN)
);

export const factoryContext = React.createContext<{
  submissionListFactory: (props: SubmissionList.IOptions) => JSX.Element;
}>({
  submissionListFactory: SubmissionListImpl
});

export namespace JudgeSubmissionArea {
  export interface IOptions {
    panel: JudgePanel;
    model: JudgeModel;
    translator: ITranslator;
    submissionListFactory: (props: SubmissionList.IOptions) => JSX.Element;
  }
}

export class JudgeSubmissionArea extends ReactWidget {
  queryClient = new QueryClient();

  private _panel: JudgePanel;
  private _model: JudgeModel;
  private _trans: TranslationBundle;
  private _submissionListFactory: (
    props: SubmissionList.IOptions
  ) => JSX.Element;

  constructor(options: JudgeSubmissionArea.IOptions) {
    super();

    this._panel = options.panel;
    this._model = options.model;
    this._trans = options.translator.load(TRANSLATOR_DOMAIN);
    this._submissionListFactory = options.submissionListFactory;
  }

  render(): JSX.Element {
    return (
      <factoryContext.Provider
        value={{ submissionListFactory: this._submissionListFactory }}
      >
        <transContext.Provider value={this._trans}>
          <QueryClientProvider client={this.queryClient}>
            <SubmissionArea
              key={this._model.problem?.id ?? ''}
              panel={this._panel}
              model={this._model}
            />
          </QueryClientProvider>
        </transContext.Provider>
      </factoryContext.Provider>
    );
  }
}
