import { OutputArea } from '@jupyterlab/outputarea';
import { IOutputModel } from '@jupyterlab/rendermime';
import { KernelMessage, Kernel } from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import { Widget, Panel, PanelLayout } from '@lumino/widgets';
import { TRANSLATOR_DOMAIN } from '../constants';

/**
 * The class name added to actual outputs
 */
const OUTPUT_AREA_OUTPUT_CLASS = 'jp-OutputArea-output';

/**
 * The class name added to the direction children of OutputArea
 */
const OUTPUT_AREA_ITEM_CLASS = 'jp-OutputArea-child';

/**
 * The class name added stdin items of OutputArea
 */
const OUTPUT_AREA_STDIN_ITEM_CLASS = 'jp-OutputArea-stdin-item';

export namespace JudgeOutputArea {
  export interface IOptions extends OutputArea.IOptions {
    translator: ITranslator;
  }
}

// Different from OutputArea
// - No prompt
// - Default Placeholder Message
export class JudgeOutputArea extends OutputArea {
  constructor(options: JudgeOutputArea.IOptions) {
    super(options);
    this.addClass('jp-JudgeOutputArea');

    const trans = options.translator.load(TRANSLATOR_DOMAIN);

    // Default Placeholder Message
    // <div class="jp-OutputArea-placeholder">No output yet</div>
    const placeholder = document.createElement('div');
    placeholder.className = 'jp-JudgeOutputArea-placeholder';
    placeholder.textContent = trans.__('Execution result will be shown here');

    this.node.appendChild(placeholder);
  }

  /**
   * Create an output item without a prompt, just the output widgets
   */
  protected createOutputItem(model: IOutputModel): Widget | null {
    const output = this.createRenderedMimetype(model);
    if (output) {
      output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    }
    return output;
  }

  /**
   * Handle an input request from a kernel.
   * Without prompt.
   */
  protected onInputRequest(
    msg: KernelMessage.IInputRequestMsg,
    future: Kernel.IShellFuture
  ): void {
    // Add an output widget to the end.
    const factory = this.contentFactory;
    const stdinPrompt = msg.content.prompt;
    const password = msg.content.password;
    const panel = new Panel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);
    panel.addClass(OUTPUT_AREA_STDIN_ITEM_CLASS);

    const input = factory.createStdin({
      prompt: stdinPrompt,
      password,
      future
    });
    input.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(input);

    const layout = this.layout as PanelLayout;
    layout.addWidget(panel);

    /**
     * Wait for the stdin to complete, add it to the model (so it persists)
     * and remove the stdin widget.
     */
    void input.value.then(value => {
      // Use stdin as the stream so it does not get combined with stdout.
      this.model.add({
        output_type: 'stream',
        name: 'stdin',
        text: value + '\n'
      });
      panel.dispose();
    });
  }
}
