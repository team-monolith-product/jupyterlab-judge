/**
 * Verifies the custom shared model (YJudge/YCodeCell) against JupyterLab's
 * real CodeCellModel / OutputAreaModel at their seam. This seam is the
 * first thing to break on a lab upgrade, so this suite is the regression
 * net for it.
 */
import { JudgeModel } from '../model';
import { IProblemProvider } from '../tokens';

function stubProvider(): IProblemProvider {
  return {
    getProblem: jest.fn().mockResolvedValue(null),
    getTestCases: jest.fn().mockResolvedValue([]),
    validate: jest.fn().mockResolvedValue(null),
    getSubmissions: jest.fn().mockResolvedValue([]),
    submit: jest.fn()
  };
}

describe('JudgeModel x lab CodeCellModel seam', () => {
  let model: JudgeModel;

  beforeEach(() => {
    model = new JudgeModel(stubProvider());
  });

  it('propagates source through the shared model to CodeCellModel in both directions', () => {
    model.source = 'print(1)';
    expect(model.codeModel.sharedModel.getSource()).toBe('print(1)');

    model.codeModel.sharedModel.setSource('print(2)');
    expect(model.source).toBe('print(2)');
  });

  it('emits contentChanged and sets dirty on source change', () => {
    const contentChanged = jest.fn();
    model.contentChanged.connect(contentChanged);

    model.source = 'x = 1';

    expect(contentChanged).toHaveBeenCalled();
    expect(model.dirty).toBe(true);
  });

  it('reflects plain object outputs into OutputAreaModel via setOutputs', () => {
    const stream = {
      output_type: 'stream',
      name: 'stdout',
      text: 'hello\n'
    };

    model.sharedModel.yCodeCell.setOutputs([stream]);

    expect(model.outputAreaModel.length).toBe(1);
    expect(model.outputAreaModel.get(0).toJSON()).toMatchObject(stream);
  });

  it('empties OutputAreaModel via clearOutputs', () => {
    model.sharedModel.yCodeCell.setOutputs([
      { output_type: 'stream', name: 'stdout', text: 'a' }
    ]);
    model.sharedModel.yCodeCell.clearOutputs(null);

    expect(model.outputAreaModel.length).toBe(0);
  });

  it('syncs merged consecutive stream outputs to the shared model without double apply', () => {
    // lab merges consecutive same-name streams into one output and calls
    // appendStreamOutput/removeStreamOutput outside ISharedCodeCell.
    model.outputAreaModel.add({
      output_type: 'stream',
      name: 'stdout',
      text: '1\n'
    });
    model.outputAreaModel.add({
      output_type: 'stream',
      name: 'stdout',
      text: '2\n'
    });

    expect(model.outputAreaModel.length).toBe(1);
    expect(
      (model.outputAreaModel.get(0).toJSON() as { text?: unknown }).text
    ).toBe('1\n2\n');

    const outputs = model.sharedModel.yCodeCell.getOutputs();
    expect(outputs).toHaveLength(1);
    expect(outputs[0].text).toBe('1\n2\n');
  });

  it('follows ydoc 3 semantics in appendStreamOutput/removeStreamOutput', () => {
    const cell = model.sharedModel.yCodeCell as unknown as {
      setOutputs(outputs: unknown[]): void;
      getOutputs(): { text?: unknown }[];
      appendStreamOutput(index: number, text: string, origin?: unknown): void;
      removeStreamOutput(index: number, start: number, origin?: unknown): void;
    };
    cell.setOutputs([
      { output_type: 'stream', name: 'stdout', text: 'abcdef' }
    ]);

    cell.appendStreamOutput(0, 'gh', 'silent-change');
    expect(cell.getOutputs()[0].text).toBe('abcdefgh');

    cell.removeStreamOutput(0, 3, 'silent-change');
    expect(cell.getOutputs()[0].text).toBe('abc');
  });

  it('returns booleans from undo/redo and restores source', () => {
    model.source = 'first';
    // Consecutive edits within 500ms merge into one undo item, so stop
    // capturing to split them.
    model.sharedModel.undoManager.stopCapturing();
    model.source = 'second';

    expect(model.sharedModel.undo()).toBe(true);
    expect(model.source).toBe('first');

    expect(model.sharedModel.redo()).toBe(true);
    expect(model.source).toBe('second');
  });

  it('round-trips the file format through fromString/toString', () => {
    const content = '{"problem_id":"7","code":"a, b = 1, 2","judge_format":1}';

    model.fromString(content);

    expect(model.sharedModel.problemId).toBe('7');
    expect(model.source).toBe('a, b = 1, 2');
    expect(model.dirty).toBe(true);
    expect(JSON.parse(model.toString())).toEqual(JSON.parse(content));
  });

  it('emits problemChanged after the provider lookup when problemId changes', async () => {
    const provider = stubProvider();
    const problem = { id: '9', skeletonCode: '' };
    (provider.getProblem as jest.Mock).mockResolvedValue(problem);
    const withProvider = new JudgeModel(provider);

    const emitted = new Promise(resolve =>
      withProvider.problemChanged.connect((_, value) => resolve(value))
    );
    withProvider.sharedModel.problemId = '9';

    expect(await emitted).toBe(problem);
    expect(provider.getProblem).toHaveBeenCalledWith('9');
  });

  it('reads and writes executionState (ydoc 3 interface compliance)', () => {
    expect(model.sharedModel.yCodeCell.executionState).toBe('idle');
    model.sharedModel.yCodeCell.executionState = 'running';
    expect(model.sharedModel.yCodeCell.executionState).toBe('running');
  });
});
