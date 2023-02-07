// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  addToolbarButtonClass,
  Dialog,
  ISessionContextDialogs,
  ReactWidget,
  showDialog,
  ToolbarButtonComponent,
  UseSignal
} from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ITranslator } from '@jupyterlab/translation';
import { saveIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { TRANSLATOR_DOMAIN } from './constants';
import { JudgePanel } from './widgets/JudgePanel';

/**
 * A namespace for the default toolbar items.
 */
export namespace ToolbarItems {
  /**
   * Create save button toolbar item.
   */
  export function createSaveButton(
    panel: JudgePanel,
    translator: ITranslator
  ): Widget {
    const trans = translator.load(TRANSLATOR_DOMAIN);
    function onClick() {
      if (panel.context.model.readOnly) {
        return showDialog({
          title: trans.__('Cannot Save'),
          body: trans.__('Document is read-only'),
          buttons: [Dialog.okButton({ label: trans.__('Ok') })]
        });
      }
      void panel.context.save().then(() => {
        if (!panel.isDisposed) {
          return panel.context.createCheckpoint();
        }
      });
    }
    return addToolbarButtonClass(
      ReactWidget.create(
        <UseSignal signal={panel.context.fileChanged}>
          {() => (
            <ToolbarButtonComponent
              icon={saveIcon}
              onClick={onClick}
              tooltip={trans.__(
                'Save the judge contents and create checkpoint'
              )}
              enabled={
                !!(
                  panel &&
                  panel.context &&
                  panel.context.contentsModel &&
                  panel.context.contentsModel.writable
                )
              }
            />
          )}
        </UseSignal>
      )
    );
  }

  /**
   * Get the default toolbar items for panel
   */
  export function getDefaultItems(
    panel: JudgePanel,
    translator: ITranslator,
    sessionDialogs?: ISessionContextDialogs
  ): DocumentRegistry.IToolbarItem[] {
    return [{ name: 'save', widget: createSaveButton(panel, translator) }];
  }
}
