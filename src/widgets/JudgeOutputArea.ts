import { OutputArea } from "@jupyterlab/outputarea";
import { IOutputModel } from "@jupyterlab/rendermime";
import { ITranslator } from "@jupyterlab/translation";
import { Widget } from '@lumino/widgets';
import { TRANSLATOR_DOMAIN } from "../constants";

/**
 * The class name added to actual outputs
 */
const OUTPUT_AREA_OUTPUT_CLASS = 'jp-OutputArea-output';

namespace JudgeOutputArea {
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

    // Default Placeholder Message
    // <div class="jp-OutputArea-placeholder">No output yet</div>
    const placeholder = document.createElement('div');
    placeholder.className = 'jp-OutputArea-placeholder';
    const trans = options.translator.load(TRANSLATOR_DOMAIN);
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
}