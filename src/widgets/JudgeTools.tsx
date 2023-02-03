import { ReactWidget } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SubmissionArea } from '../components/SubmissionArea';
import { TRANSLATOR_DOMAIN } from '../constants';
import { JudgeModel } from '../model';
import { JudgePanel } from './JudgePanel';

export const transContext = React.createContext<TranslationBundle>(
  nullTranslator.load(TRANSLATOR_DOMAIN)
);

export namespace JudgeTools {
  export interface IOptions {
    panel: JudgePanel;
    model: JudgeModel;
    translator: ITranslator;
  }
}

export class JudgeTools extends ReactWidget {
  queryClient = new QueryClient();

  private _panel: JudgePanel;
  private _model: JudgeModel;
  private _translator: ITranslator;

  constructor(options: JudgeTools.IOptions) {
    super();

    this._panel = options.panel;
    this._model = options.model;
    this._translator = options.translator;
  }

  render(): JSX.Element {
    return (
      <transContext.Provider value={this._translator.load(TRANSLATOR_DOMAIN)}>
        <QueryClientProvider client={this.queryClient}>
          <SubmissionArea
            key={this._model.problem?.id ?? ''}
            panel={this._panel}
            model={this._model}
          />
        </QueryClientProvider>
      </transContext.Provider>
    );
  }
}
