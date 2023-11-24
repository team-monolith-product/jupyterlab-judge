import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { Panel } from '@lumino/widgets';
import { JudgeModel } from '../model';
import {
  IRenderMime,
  IRenderMimeRegistry,
  MimeModel
} from '@jupyterlab/rendermime';
import { TRANSLATOR_DOMAIN } from '../constants';

export class JudgeProblemPanel extends Panel implements IJudgeProblemPanel {
  constructor(
    options: JudgeProblemPanel.IOptions,
    rendermime: IRenderMimeRegistry
  ) {
    super();
    this._model = options.model;
    this._trans = options.translator.load(TRANSLATOR_DOMAIN);
    this._markdownRenderer = rendermime.createRenderer('text/markdown');
    this._markdownRenderer.addClass('jp-JudgePanel-problem');
    this.addWidget(this._markdownRenderer);
  }

  renderProblem(): void {
    this._markdownRenderer.renderModel(
      new MimeModel({
        data: {
          ['text/markdown']:
            this._model.problem?.content ??
            this._trans.__('Problem Not Available.') // 문제를 불러오지 못했습니다.
        }
      })
    );
  }

  private _model: JudgeModel;
  private _trans: TranslationBundle;
  private _markdownRenderer: IRenderMime.IRenderer;
}

export interface IJudgeProblemPanel extends Panel {
  renderProblem(): void;
}

export namespace JudgeProblemPanel {
  export interface IOptions {
    model: JudgeModel;
    translator: ITranslator;
  }
}
