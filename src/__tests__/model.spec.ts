/**
 * 커스텀 공유 모델(YJudge/YCodeCell)이 JupyterLab 의 실제 CodeCellModel /
 * OutputAreaModel 과 맞물리는 접합부를 검증합니다. lab 버전 업그레이드 시
 * 이 접합부가 가장 먼저 깨지는 지점이라 회귀망 역할을 합니다.
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

describe('JudgeModel × lab CodeCellModel 접합부', () => {
  let model: JudgeModel;

  beforeEach(() => {
    model = new JudgeModel(stubProvider());
  });

  it('source 가 공유 모델을 거쳐 CodeCellModel 로 양방향 전파된다', () => {
    model.source = 'print(1)';
    expect(model.codeModel.sharedModel.getSource()).toBe('print(1)');

    model.codeModel.sharedModel.setSource('print(2)');
    expect(model.source).toBe('print(2)');
  });

  it('source 변경이 contentChanged 와 dirty 를 발화한다', () => {
    const contentChanged = jest.fn();
    model.contentChanged.connect(contentChanged);

    model.source = 'x = 1';

    expect(contentChanged).toHaveBeenCalled();
    expect(model.dirty).toBe(true);
  });

  it('setOutputs 의 plain object 출력이 OutputAreaModel 에 반영된다', () => {
    const stream = {
      output_type: 'stream',
      name: 'stdout',
      text: 'hello\n'
    };

    model.sharedModel.yCodeCell.setOutputs([stream]);

    expect(model.outputAreaModel.length).toBe(1);
    expect(model.outputAreaModel.get(0).toJSON()).toMatchObject(stream);
  });

  it('clearOutputs 가 OutputAreaModel 을 비운다', () => {
    model.sharedModel.yCodeCell.setOutputs([
      { output_type: 'stream', name: 'stdout', text: 'a' }
    ]);
    model.sharedModel.yCodeCell.clearOutputs(null);

    expect(model.outputAreaModel.length).toBe(0);
  });

  it('undo/redo 가 boolean 을 반환하며 source 를 복원한다', () => {
    model.source = 'first';
    // 500ms 내 연속 편집은 한 undo 항목으로 병합되므로 캡처를 끊어 분리함.
    model.sharedModel.undoManager.stopCapturing();
    model.source = 'second';

    expect(model.sharedModel.undo()).toBe(true);
    expect(model.source).toBe('first');

    expect(model.sharedModel.redo()).toBe(true);
    expect(model.source).toBe('second');
  });

  it('fromString/toString 이 파일 포맷을 왕복 보존한다', () => {
    const content = '{"problem_id":"7","code":"a, b = 1, 2","judge_format":1}';

    model.fromString(content);

    expect(model.sharedModel.problemId).toBe('7');
    expect(model.source).toBe('a, b = 1, 2');
    expect(model.dirty).toBe(true);
    expect(JSON.parse(model.toString())).toEqual(JSON.parse(content));
  });

  it('problemId 변경 시 provider 조회 후 problemChanged 를 발화한다', async () => {
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

  it('executionState 를 읽고 쓸 수 있다 (ydoc 3 인터페이스 준수)', () => {
    expect(model.sharedModel.yCodeCell.executionState).toBe('idle');
    model.sharedModel.yCodeCell.executionState = 'running';
    expect(model.sharedModel.yCodeCell.executionState).toBe('running');
  });
});
