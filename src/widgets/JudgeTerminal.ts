import { Widget, Panel } from '@lumino/widgets';
import { JudgeOutputArea } from './JudgeOutputArea';
import { LabIcon, runIcon, stopIcon } from '@jupyterlab/ui-components';
import { TRANSLATOR_DOMAIN } from '../constants';
import { JudgePanel } from './JudgePanel';
import { cornerUpLeftDoubleFillSvg } from '@team-monolith/cds';

const resetIcon = new LabIcon({
  name: 'judge-icon:reset',
  svgstr: cornerUpLeftDoubleFillSvg
});

export namespace JudgeTerminal {
  export interface IOptions extends JudgeOutputArea.IOptions {
    panel: JudgePanel;
  }
  export interface IJudgeTerminal extends Widget {
    outputArea: JudgeOutputArea;
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

    // Reset to skeleton code button
    const resetButton = document.createElement('button');
    resetButton.className = 'jp-JudgeTerminal-resetButton';
    resetIcon.element({ container: resetButton });
    const icon = resetButton.children.item(0);
    if (icon) {
      // It must exist
      // To follow JL's icon style add class and fill attribute
      // Actualy value of fill attribute is not important
      icon.classList.add('jp-icon3');
      icon.setAttribute('fill', 'FFFFFF');
    }
    const resetButtonLabel = document.createElement('span');
    resetButtonLabel.className = 'jp-JudgeTerminal-resetButtonLabel';
    resetButtonLabel.textContent = trans.__('Reset to skeleton code');
    resetButton.addEventListener('click', () => {
      if (!options.panel.model.problem) {
        return;
      }

      options.panel.model.codeModel.sharedModel.setSource(
        options.panel.model.problem.skeletonCode ?? '# 여기에 입력하세요.'
      );
    });
    resetButton.appendChild(resetButtonLabel);

    // Seperator
    const seperator1 = document.createElement('div');
    seperator1.className = 'jp-JudgeTerminal-seperator';

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
      try {
        await options.panel.execute();
      } catch (e) {
        executeButton.disabled = false;
        throw e;
      }
      executeButton.disabled = false;
    });
    executeButton.appendChild(excuteButtonLabel);

    // Seperator
    const seperator2 = document.createElement('div');
    seperator2.className = 'jp-JudgeTerminal-seperator';

    // Stop Button
    const stopButton = document.createElement('button');
    stopButton.className = 'jp-JudgeTerminal-stopButton';
    stopIcon.element({ container: stopButton });
    const stopButtonLabel = document.createElement('span');
    stopButtonLabel.className = 'jp-JudgeTerminal-stopButtonLabel';
    stopButtonLabel.textContent = trans.__('Stop');
    stopButton.addEventListener('click', async () => {
      await options.panel.session.shutdown();
    });
    stopButton.appendChild(stopButtonLabel);

    toolbar.node.appendChild(resetButton);
    toolbar.node.appendChild(seperator1);
    toolbar.node.appendChild(executeButton);
    toolbar.node.appendChild(seperator2);
    toolbar.node.appendChild(stopButton);

    this.addWidget(toolbar);

    this._outputArea = new JudgeOutputArea(options);
    this.addWidget(this._outputArea);
  }

  get outputArea(): JudgeOutputArea {
    return this._outputArea;
  }
}
