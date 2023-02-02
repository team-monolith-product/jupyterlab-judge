import { Widget } from '@lumino/widgets';
import { JudgeOutputArea } from './JudgeOutputArea';
import { runIcon, stopIcon } from '@jupyterlab/ui-components';
import { TRANSLATOR_DOMAIN } from '../constants';
import { JudgePanel } from './JudgePanel';


export namespace JudgeTerminal {
  export interface IOptions extends JudgeOutputArea.IOptions {
    panel: JudgePanel;
  }
}

// This is terminal look-like widget for judge output.
// It includes execute and stop buttons
export class JudgeTerminal extends Widget {
  private _outputArea: JudgeOutputArea;

  constructor(options: JudgeTerminal.IOptions) {
    super();

    const translator = options.translator;
    const trans = translator.load(TRANSLATOR_DOMAIN);

    this.addClass('jp-JudgeTerminal');

    // Create toolbar
    // Execute Button
    const toolbar = document.createElement('div');
    toolbar.className = 'jp-JudgeTerminal-toolbar';
    const executeButton = document.createElement('button');
    executeButton.className = 'jp-JudgeTerminal-executeButton';
    runIcon.element({ container: executeButton });
    const excuteButtonLabel = document.createElement('span');
    excuteButtonLabel.className = 'jp-JudgeTerminal-executeButtonLabel';
    excuteButtonLabel.textContent = trans.__('Execute');
    executeButton.addEventListener('click', () => {
      options.panel.execute();
    });
    executeButton.appendChild(excuteButtonLabel);

    // Seperator
    const seperator = document.createElement('div');
    seperator.className = 'jp-JudgeTerminal-seperator';

    // Stop Button    
    const stopButton = document.createElement('button');
    stopButton.className = 'jp-JudgeTerminal-stopButton';
    stopIcon.element({ container: stopButton });
    const stopButtonLabel = document.createElement('span');
    stopButtonLabel.className = 'jp-JudgeTerminal-stopButtonLabel';
    stopButtonLabel.textContent = trans.__('Stop');
    stopButton.addEventListener('click', () => {
      options.panel.session.shutdown();
    });
    stopButton.appendChild(stopButtonLabel);

    toolbar.appendChild(executeButton);
    toolbar.appendChild(seperator);
    toolbar.appendChild(stopButton);

    this.node.appendChild(toolbar);

    this._outputArea = new JudgeOutputArea(options);
    this.node.appendChild(this._outputArea.node);
  }

  get outputArea(): JudgeOutputArea {
    return this._outputArea;
  }
}
