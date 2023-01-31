import { IWidgetTracker, ReactWidget, UseSignal } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SubmissionArea } from '../components/SubmissionArea';
import { TRANSLATOR_DOMAIN } from '../constants';
import { JudgeDocument } from './JudgePanel';

export const transContext = React.createContext<TranslationBundle>(
  nullTranslator.load(TRANSLATOR_DOMAIN)
);

export class JudgeTools extends ReactWidget {
  private _tracker: IWidgetTracker<JudgeDocument>;
  queryClient = new QueryClient();
  private _translator: ITranslator;

  constructor(options: JudgeTools.IOptions) {
    super();

    this._tracker = options.tracker;
    this._translator = options.translator;
  }

  render(): JSX.Element {
    return (
      <transContext.Provider value={this._translator.load(TRANSLATOR_DOMAIN)}>
        <QueryClientProvider client={this.queryClient}>
          <UseSignal
            signal={this._tracker.currentChanged}
            initialSender={this._tracker}
            initialArgs={this._tracker.currentWidget}
          >
            {(tracker, document) => {
              return (
                <SubmissionArea
                  key={document?.id}
                  model={document?.content.model ?? null}
                />
              );
            }}
          </UseSignal>
        </QueryClientProvider>
      </transContext.Provider>
    );
  }
}

export namespace JudgeTools {
  export interface IOptions {
    /**
     * The judge tracker used by the judge tools.
     */
    tracker: IWidgetTracker<JudgeDocument>;

    /**
     * Language translator.
     */
    translator: ITranslator;
  }
}
