import { OutputArea } from "@jupyterlab/outputarea";
import { IOutputModel } from "@jupyterlab/rendermime";
import { Widget } from '@lumino/widgets';

/**
 * The class name added to actual outputs
 */
const OUTPUT_AREA_OUTPUT_CLASS = 'jp-OutputArea-output';

export class NoPromptOutputArea extends OutputArea {
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