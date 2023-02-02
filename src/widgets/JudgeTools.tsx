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

export const transContext = React.createContext<TranslationBundle>(
  nullTranslator.load(TRANSLATOR_DOMAIN)
);

export namespace JudgeTools {
  export interface IOptions {
    model: JudgeModel;

    /**
     * Language translator.
     */
    translator: ITranslator;
  }
}

export class JudgeTools extends ReactWidget {
  private _model: JudgeModel;
  queryClient = new QueryClient();
  private _translator: ITranslator;

  constructor(options: JudgeTools.IOptions) {
    super();

    this._model = options.model;
    this._translator = options.translator;
  }

  render(): JSX.Element {
    return (
      <transContext.Provider value={this._translator.load(TRANSLATOR_DOMAIN)}>
        <QueryClientProvider client={this.queryClient}>
          <SubmissionArea
            key={this._model.problem?.id ?? ''}
            model={this._model}
          />
        </QueryClientProvider>
      </transContext.Provider>
    );
  }
}
