import * as models from '@jupyter/ydoc';
import * as Y from 'yjs';
import type * as nbformat from '@jupyterlab/nbformat';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IModelDB, ModelDB } from '@jupyterlab/observables';
import { ISignal, Signal } from '@lumino/signaling';
import { PartialJSONObject } from '@lumino/coreutils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
import { CodeCellModel } from '@jupyterlab/cells';
import { IProblemProvider } from './tokens';
import { ProblemProvider } from './problemProvider/problemProvider';
import { IOutput, IBaseCell } from '@jupyterlab/nbformat';
import { IMapChange } from '@jupyter/ydoc';
import type { PartialJSONValue } from '@lumino/coreutils';
import { Awareness } from 'y-protocols/awareness';
import { Contents } from '@jupyterlab/services';

export class JudgeModel implements DocumentRegistry.IModel {
  constructor(problemProvider: IProblemProvider) {
    this.modelDB = new ModelDB();
    this.sharedModel = new JudgeModel.YJudge();
    this.sharedModel.changed.connect(
      async (sender, judgeChange: JudgeModel.IJudgeChange) => {
        if (judgeChange.problemIdChange) {
          this._problem = await this._problemProvider.getProblem(
            judgeChange.problemIdChange
          );
          this._problemChanged.emit(this._problem);
        }

        if (judgeChange.stateChange) {
          judgeChange.stateChange.forEach(value => {
            if (value.name === 'dirty') {
              this.dirty = value.newValue;
            }
          });
        }

        if (judgeChange.sourceChange) {
          this._contentChanged.emit();
          this.dirty = true;
        }
      }
    );

    this._codeModel = new CodeCellModel({});
    this._codeModel.mimeType = 'text/x-python';
    this._codeModel.switchSharedModel(this.sharedModel.yCodeCell, true);

    this._problem = null;
    this._problemProvider = problemProvider;
  }

  readonly collaborative = true;

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  /**
   * A signal emitted when the document state changes.
   */
  get stateChanged(): ISignal<this, IChangedArgs<any>> {
    return this._stateChanged;
  }

  /**
   * The dirty state of the document.
   */
  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(newValue: boolean) {
    const oldValue = this._dirty;
    if (newValue === oldValue) {
      return;
    }
    this._dirty = newValue;
    this._stateChanged.emit({
      name: 'dirty',
      oldValue,
      newValue
    });
  }
  /**
   * The read only state of the document.
   */
  get readOnly(): boolean {
    return false;
  }
  set readOnly(newValue: boolean) {
    // Not Implemented Yet.
  }

  /**
   * Whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  initialize(): void {
    // Nothing to do
  }

  get defaultKernelName(): string {
    return `Judge: Problem ${this.sharedModel.problemId}`;
  }

  get defaultKernelLanguage(): string {
    return 'python';
  }

  readonly sharedModel: JudgeModel.YJudge;
  // We don't manage modelDB now.
  readonly modelDB: IModelDB;

  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
  private _isDisposed = false;

  // Usually passed to  CodeEditorWrapper
  get codeModel(): CodeEditor.IModel {
    return this._codeModel;
  }

  private _codeModel: CodeCellModel;

  get source(): string {
    return this.sharedModel.source;
  }

  set source(value: string) {
    this.sharedModel.source = value;
  }

  // Usually passed to NoPromptOutputArea
  get outputAreaModel(): IOutputAreaModel {
    return this._codeModel.outputs;
  }

  getMetadata(): {
    [x: string]: any;
  } {
    return this.sharedModel.getMetadata();
  }
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  setMetadata(key: string, value: any): void {
    this.sharedModel.setMetadata(key, value);
  }

  get problem(): ProblemProvider.IProblem | null {
    return this._problem;
  }

  get problemChanged(): ISignal<this, ProblemProvider.IProblem | null> {
    return this._problemChanged;
  }

  async submissions(): Promise<ProblemProvider.ISubmission[]> {
    return await this._problemProvider.getSubmissions(
      this.sharedModel.problemId
    );
  }

  get submissionsChanged(): ISignal<this, ProblemProvider.ISubmission[]> {
    return this._submissionsChanged;
  }

  get submissionStatus(): JudgeModel.SubmissionStatus {
    return this._submissionStatus;
  }

  set submissionStatus(value: JudgeModel.SubmissionStatus) {
    this._submissionStatus = value;
    this._submissionStatusChanged.emit(this._submissionStatus);
  }

  get submissionStatusChanged(): ISignal<this, JudgeModel.SubmissionStatus> {
    return this._submissionStatusChanged;
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }

  fromString(value: string): void {
    try {
      this.fromJSON(JSON.parse(value));
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.fromJSON({
          problem_id: '',
          code: '',
          judge_format: 1
        });
      } else {
        throw e;
      }
    }
  }

  toJSON(): JudgeModel.IJudgeContent {
    return {
      problem_id: this.sharedModel.problemId,
      code: this.sharedModel.source,
      judge_format: 1
    };
  }

  fromJSON(value: JudgeModel.IJudgeContent): void {
    this.sharedModel.source =
      value.code ??
      '# 파일이 손상되었습니다. 파일을 삭제하고 새로 생성해주세요.';

    this.sharedModel.problemId = value.problem_id ?? '';
    this.dirty = true;
  }

  async getTestCases(): Promise<string[]> {
    return await this._problemProvider.getTestCases(this.sharedModel.problemId);
  }

  async validate(outputs: string[]): Promise<ProblemProvider.IValidateResult> {
    return await this._problemProvider.validate(
      this.sharedModel.problemId,
      outputs
    );
  }

  async submit(
    request: ProblemProvider.ISubmissionRequest
  ): Promise<ProblemProvider.ISubmission> {
    const submission = await this._problemProvider.submit(request);
    this._submissionsChanged.emit(
      await this._problemProvider.getSubmissions(this.sharedModel.problemId)
    );
    return submission;
  }

  private _dirty = false;
  private _problem: ProblemProvider.IProblem | null;
  private _problemChanged = new Signal<this, ProblemProvider.IProblem | null>(
    this
  );
  private _problemProvider: IProblemProvider;

  private _submissionsChanged = new Signal<this, ProblemProvider.ISubmission[]>(
    this
  );

  private _submissionStatus: JudgeModel.SubmissionStatus = { type: 'idle' };
  private _submissionStatusChanged = new Signal<
    this,
    JudgeModel.SubmissionStatus
  >(this);
}

export namespace JudgeModel {
  export type SubmissionStatus =
    | {
        type: 'idle';
      }
    | {
        type: 'progress';
        runCount: number;
        totalCount: number;
      }
    | {
        type: 'error';
        errorDetails: string;
      };

  export interface IJudgeContent extends PartialJSONObject {
    // Json 에 대해서는 underscore를 사용한다.
    // Notebook 이 이미 이렇게 구현되어 있다.
    code: string;
    problem_id: string;
    judge_format: number;
  }

  export class JudgeModelFactory
    implements DocumentRegistry.IModelFactory<JudgeModel>
  {
    constructor(options: { problemProviderFactory: () => IProblemProvider }) {
      this._problemProviderFactory = options.problemProviderFactory;
    }

    readonly collaborative = true;
    readonly name = 'judge-model';
    get contentType(): Contents.ContentType {
      return 'judge' as Contents.ContentType;
    }
    readonly fileFormat = 'text';

    /**
     * Get whether the model factory has been disposed.
     *
     * @returns disposed status
     */
    get isDisposed(): boolean {
      return this._disposed;
    }

    /**
     * Dispose the model factory.
     */
    dispose(): void {
      this._disposed = true;
    }

    /**
     * Get the preferred language given the path on the file.
     *
     * @param path path of the file represented by this document model
     * @returns The preferred language
     */
    preferredLanguage(path: string): string {
      return 'python';
    }

    /**
     * Create a new instance of ExampleDocModel.
     *
     * @param languagePreference Language
     * @param modelDB Model database
     * @returns The model
     */
    createNew(languagePreference?: string, modelDB?: IModelDB): JudgeModel {
      return new JudgeModel(this._problemProviderFactory());
    }

    private _disposed = false;
    private _problemProviderFactory: () => IProblemProvider;
  }

  export interface IJudgeChange
    extends models.SourceChange,
      models.DocumentChange {
    problemIdChange?: string;
  }

  export class YJudge extends models.YDocument<IJudgeChange> {
    constructor() {
      super();

      this._problemId = this.ydoc.getText('problem_id');
      this._source = this.ydoc.getText('source');
      this._outputs = this.ydoc.getArray('outputs');
      this._metadata = this.ydoc.getMap('metadata');
      this._ycodeCell = new YCodeCell(this, this._source, this._outputs);

      this._problemId.observe(event => {
        this._changed.emit({ problemIdChange: this.problemId });
      });
      this._ycodeCell.changed.connect((_, change) => {
        this._changed.emit(change);
      });

      this.undoManager = new Y.UndoManager([this._source]);
    }

    /**
     * Dispose of the resources.
     */
    dispose(): void {
      /* no-op */
    }

    get yCodeCell(): models.ISharedCodeCell {
      return this._ycodeCell;
    }

    get problemId(): string {
      return this._problemId.toString();
    }
    set problemId(value: string) {
      this.transact(() => {
        const ytext = this._problemId;
        ytext.delete(0, ytext.length);
        ytext.insert(0, value);
      });
    }
    get source(): string {
      return this._ycodeCell.getSource() ?? '';
    }
    set source(value: string) {
      this._ycodeCell.setSource(value);
    }

    getMetadata(): {
      [x: string]: any;
    } {
      return this._metadata.toJSON();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    setMetadata(key: string, value: any): void {
      this._metadata.set(key, value);
    }

    private _ycodeCell: models.ISharedCodeCell;
    private _problemId: Y.Text;
    private _source: Y.Text;
    private _outputs: Y.Array<nbformat.IOutput>;
    private _metadata: Y.Map<any>;
    public undoManager: Y.UndoManager;
  }

  class YCodeCell implements models.ISharedCodeCell, models.IYText {
    constructor(
      yjudge: YJudge,
      source: Y.Text,
      outputs: Y.Array<nbformat.IOutput>
    ) {
      this._yjudge = yjudge;
      this._source = source;
      this._outputs = outputs;

      this._source.observe(this._sourceObserver);
      this._outputs.observe(this._outputsObserver);
    }

    readonly id = '';
    readonly cell_type = 'code';
    readonly execution_count = 0;
    readonly isStandalone = true;
    readonly notebook = null;
    readonly metadata = {};
    readonly metadataChanged = new Signal<this, IMapChange<any>>(this);
    get changed(): ISignal<
      this,
      models.CellChange<nbformat.IBaseCellMetadata>
    > {
      return this._changed;
    }
    get outputs(): Array<nbformat.IOutput> {
      return this.getOutputs();
    }
    getOutputs(): IOutput[] {
      return this._outputs.toArray();
    }
    setOutputs(outputs: IOutput[]): void {
      this.transact(() => {
        this._outputs.delete(0, this._outputs.length);
        this._outputs.insert(0, outputs);
      }, false);
    }
    updateOutputs(start: number, end: number, outputs: IOutput[]): void {
      const fin =
        end < this._outputs.length ? end - start : this._outputs.length - start;
      this.transact(() => {
        this._outputs.delete(start, fin);
        this._outputs.insert(start, outputs);
      }, false);
    }
    toJSON(): IBaseCell {
      throw new Error('Method not implemented.');
    }
    getId(): string {
      return '';
    }
    deleteMetadata(key: string): void {
      // no-op
    }
    getMetadata(key?: unknown) {
      return {};
    }
    setMetadata(metadata: nbformat.INotebookMetadata): void;
    setMetadata(metadata: string, value: PartialJSONValue): void;
    setMetadata(
      metadata: nbformat.INotebookMetadata | string,
      value?: PartialJSONValue
    ): void {
      // no-op
    }
    get source(): string {
      return this.getSource();
    }
    getSource(): string {
      return this._source.toString();
    }
    setSource(value: string): void {
      this.transact(() => {
        const ytext = this._source;
        ytext.delete(0, ytext.length);
        ytext.insert(0, value);
      });
    }
    updateSource(start: number, end: number, value = ''): void {
      this.transact(() => {
        const ysource = this._source;
        // insert and then delete.
        // This ensures that the cursor position is adjusted after the replaced content.
        ysource.insert(start, value);
        ysource.delete(start + value.length, end - start);
      });
    }

    private _sourceObserver = (event: Y.YTextEvent): void => {
      this._changed.emit({
        sourceChange: event.changes.delta as models.Delta<string>
      });
    };
    private _outputsObserver = (
      event: Y.YArrayEvent<nbformat.IOutput>
    ): void => {
      this._changed.emit({
        outputsChange: event.changes.delta as models.Delta<IOutput[]>
      });
    };

    undo(): void {
      this._yjudge.undo();
    }
    redo(): void {
      this._yjudge.redo();
    }
    canUndo(): boolean {
      return this._yjudge.canUndo();
    }
    canRedo(): boolean {
      return this._yjudge.canRedo();
    }
    clearUndoHistory(): void {
      this._yjudge.clearUndoHistory();
    }
    transact(f: () => void, undoable?: boolean | undefined): void {
      this._yjudge.ydoc.transact(f, undoable);
    }

    get disposed(): ISignal<this, void> {
      return this._disposed;
    }
    get isDisposed(): boolean {
      return this._isDisposed;
    }
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      this._source.unobserve(this._sourceObserver);
      this._outputs.unobserve(this._outputsObserver);
      this._disposed.emit();
      Signal.clearData(this);
    }

    get ysource(): Y.Text {
      return this._source;
    }
    get awareness(): Awareness {
      return this._yjudge.awareness;
    }
    get undoManager(): Y.UndoManager {
      return this._yjudge.undoManager;
    }

    private _yjudge: YJudge;
    private _source: Y.Text;
    private _outputs: Y.Array<nbformat.IOutput>;
    private _changed = new Signal<
      this,
      models.CellChange<nbformat.IBaseCellMetadata>
    >(this);
    private _isDisposed = false;
    private _disposed = new Signal<this, void>(this);
  }

  export async function newFileContent(
    problemProvider: IProblemProvider,
    problemId: string
  ): Promise<string> {
    const content: IJudgeContent = {
      problem_id: problemId,
      code:
        (await problemProvider.getProblem(problemId))?.skeletonCode ??
        '# 여기에 입력하세요',
      judge_format: 1
    };
    return JSON.stringify(content);
  }
}
