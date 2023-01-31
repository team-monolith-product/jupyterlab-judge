import * as models from '@jupyterlab/shared-models';
import * as Y from 'yjs';
import * as nbformat from '@jupyterlab/nbformat';

import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IModelDB, ModelDB } from '@jupyterlab/observables';
import { Contents } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';
import { PartialJSONObject } from '@lumino/coreutils';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Awareness } from 'y-protocols/awareness';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
import { CodeCellModel } from '@jupyterlab/cells';
import { IProblemProvider } from './tokens';
import { ProblemProvider } from './problemProvider/problemProvider';

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
      }
    );

    this._codeModel = new CodeCellModel({});
    this._codeModel.mimeType = 'text/x-python';
    this.sharedModel.ycodeCellChanged.connect((sender, ycodeCell) => {
      this._codeModel.switchSharedModel(ycodeCell, true);
    });

    this._problem = null;
    this._problemProvider = problemProvider;
  }

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
    return this.sharedModel.dirty;
  }
  set dirty(newValue: boolean) {
    if (newValue === this.dirty) {
      return;
    }
    this.sharedModel.dirty = newValue;
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
    return `Judge: Problem ${this.sharedModel.getProblemId()}`;
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

  // CodeEditorWrapper 에 전달되기 위해 사용됨
  get codeModel(): CodeEditor.IModel {
    return this._codeModel;
  }

  private _codeModel: CodeCellModel;

  get source(): string {
    return this.sharedModel.getSource();
  }

  set source(value: string) {
    this.sharedModel.setSource(value);
  }

  // NoPromptOutputArea 에 전달되기 위해 사용됨
  get outputAreaModel(): IOutputAreaModel {
    return this._codeModel.outputs;
  }

  get problem(): ProblemProvider.IProblem | null {
    return this._problem;
  }

  get problemChanged(): ISignal<this, ProblemProvider.IProblem | null> {
    return this._problemChanged;
  }

  async submissions(): Promise<ProblemProvider.ISubmission[]> {
    return await this._problemProvider.getSubmissions(
      this.sharedModel.getProblemId()
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
      problem_id: this.sharedModel.getProblemId(),
      code: this.sharedModel.getSource(),
      judge_format: 1
    };
  }

  fromJSON(value: JudgeModel.IJudgeContent) {
    this.sharedModel.createCellModelFromSource(
      value.code ??
        '# 파일이 손상되었습니다. 파일을 삭제하고 새로 생성해주세요.'
    );
    // fromJSON 은 초기 Cell Model 을 생성해야하는 영역입니다.
    // setSource 는 Cell Model 을 생성하지 않았다면 작동하지 않습니다.
    // this.sharedModel.setSource(value.code ?? '# 파일이 손상되었습니다. 파일을 삭제하고 새로 생성해주세요.');
    this.sharedModel.setProblemId(value.problem_id ?? '');
  }

  async getTestCases(): Promise<string[]> {
    return await this._problemProvider.getTestCases(
      this.sharedModel.getProblemId()
    );
  }

  async validate(outputs: string[]): Promise<ProblemProvider.IValidateResult> {
    return await this._problemProvider.validate(
      this.sharedModel.getProblemId(),
      outputs
    );
  }

  async submit(
    request: ProblemProvider.ISubmissionRequest
  ): Promise<ProblemProvider.ISubmission> {
    const submission = await this._problemProvider.submit(request);
    this._submissionsChanged.emit(
      await this._problemProvider.getSubmissions(
        this.sharedModel.getProblemId()
      )
    );
    return submission;
  }

  private _problem: ProblemProvider.IProblem | null;
  private _problemChanged = new Signal<this, ProblemProvider.IProblem | null>(
    this
  );
  private _problemProvider: IProblemProvider;

  private _submissionsChanged = new Signal<
    this,
    ProblemProvider.ISubmission[]
  >(this);

  private _submissionStatus: JudgeModel.SubmissionStatus = {
    inProgress: false,
    runCount: 0,
    totalCount: 0
  };
  private _submissionStatusChanged = new Signal<
    this,
    JudgeModel.SubmissionStatus
  >(this);
}

export namespace JudgeModel {
  export type SubmissionStatus = {
    inProgress: boolean;
    runCount: number;
    totalCount: number;
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

    /**
     * The name of the model.
     *
     * @returns The name
     */
    get name(): string {
      return 'judge-model';
    }

    /**
     * The content type of the file.
     *
     * @returns The content type
     */
    get contentType(): Contents.ContentType {
      return 'file';
    }

    /**
     * The format of the file.
     *
     * @returns the file format
     */
    get fileFormat(): Contents.FileFormat {
      return 'text';
    }

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
    extends models.DocumentChange,
      models.TextChange {
    problemIdChange?: string;
  }

  export class YJudge extends models.YDocument<IJudgeChange> {
    constructor() {
      super();

      this._yproblemId.observe(event => {
        this._changed.emit({ problemIdChange: this.getProblemId() });
      });

      this._ycodeCell = null;

      this._cell().observe((event, transact) => {
        if (event.changes.keys.get('id')) {
          // createCellModelFromSource 을 통해 새로 Cell 이 생성되었을 때
          this._switchCodeCell(this._cell());
        }
      });
    }

    createCellModelFromSource(source: string): void {
      this.transact(() => {
        const ymodel = this._cell();
        ymodel.set('source', new Y.Text(source));
        ymodel.set('metadata', {});
        ymodel.set('cell_type', 'code');
        ymodel.set('id', '');
        ymodel.set('execution_count', 0); // for some default value
        ymodel.set('outputs', new Y.Array<nbformat.IOutput>());
      });
      this._switchCodeCell(this._cell());
    }

    private _cell(): Y.Map<any> {
      return this.ydoc.getMap('cell');
    }

    private _switchCodeCell(value: Y.Map<any>) {
      const ycodeCellPrev = this._ycodeCell;
      this._ycodeCell = new YCodeCell(value, this);
      this._ycodeCell.undoManager = this.undoManager;
      this.undoManager.clear();
      this._ycodeCellChanged.emit(this._ycodeCell);
      this._ycodeCell.changed.connect((sender, change) => {
        if (change.sourceChange) {
          this.dirty = true;
        }
      });

      ycodeCellPrev?.dispose();
    }

    get changed(): ISignal<this, IJudgeChange> {
      return this._changed;
    }

    get ycodeCellChanged(): ISignal<this, models.YCodeCell> {
      return this._ycodeCellChanged;
    }

    /**
     * Dispose of the resources.
     */
    dispose(): void {}

    get yCodeCell(): models.YCodeCell | null {
      return this._ycodeCell;
    }

    getProblemId(): string {
      return this._yproblemId.toString();
    }

    public setProblemId(value: string): void {
      this.transact(() => {
        const ytext = this._yproblemId;
        ytext.delete(0, ytext.length);
        ytext.insert(0, value);
      });
    }

    getSource(): string {
      return this._ycodeCell?.getSource() ?? '';
    }

    setSource(value: string): void {
      if (this._ycodeCell) {
        this._ycodeCell.setSource(value);
      }
    }

    // YDocument에서는 source에 대해서 undoManager 가 정의되어 있어
    // 수정합니다.
    public undoManager = new Y.UndoManager([this._cell()], {
      trackedOrigins: new Set([this])
    });

    private _ycodeCell: models.YCodeCell | null;
    private _yproblemId = this.ydoc.getText('problemId');
    private _ycodeCellChanged = new Signal<this, models.YCodeCell>(this);
  }

  // models.YCodeCell는 Awareness 가 YNotebook 에 종속적이다.
  // 따라서 YJudge에 종속적이도록 수정한다.
  class YCodeCell extends models.YCodeCell {
    constructor(map: Y.Map<any>, yjudge: YJudge) {
      super(map);
      this._yjudge = yjudge;
    }

    get awareness(): Awareness | null {
      return this._yjudge.awareness;
    }

    private _yjudge: YJudge;
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
