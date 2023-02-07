import { Widget, Panel } from '@lumino/widgets';
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
export class JudgeTerminal extends Panel {
  private _outputArea: JudgeOutputArea;

  constructor(options: JudgeTerminal.IOptions) {
    super();
    this.addClass('jp-JudgeTerminal');

    const translator = options.translator;
    const trans = translator.load(TRANSLATOR_DOMAIN);


    // Create toolbar
    const toolbar = new Widget();


    // Execute Button
    toolbar.addClass('jp-JudgeTerminal-toolbar');
    const executeButton = document.createElement('button');
    executeButton.className = 'jp-JudgeTerminal-executeButton';
    runIcon.element({ container: executeButton });
    const excuteButtonLabel = document.createElement('span');
    excuteButtonLabel.className = 'jp-JudgeTerminal-executeButtonLabel';
    excuteButtonLabel.textContent = trans.__('Execute');
    executeButton.addEventListener('click', async () => {
      executeButton.disabled = true;
      await options.panel.execute();
      executeButton.disabled = false;
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
    
    toolbar.node.appendChild(executeButton);
    toolbar.node.appendChild(seperator);
    toolbar.node.appendChild(stopButton);

    this.addWidget(toolbar);

    this._outputArea = new JudgeOutputArea(options);
    this.addWidget(this._outputArea);
  }

  get outputArea(): JudgeOutputArea {
    return this._outputArea;
  }
}
