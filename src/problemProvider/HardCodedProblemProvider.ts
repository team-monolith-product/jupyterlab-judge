import { IProblemProvider } from '../tokens';
import { ProblemProvider } from './problemProvider';

export class HardCodedProblemProvider implements IProblemProvider {
  problems: {
    [id: string]: ProblemProvider.IProblem & {
      testCases: string[];
      outputs: string[];
    };
  } = {
    '1': {
      id: '1',
      title: '덧셈',
      timeout: 1,
      inputTransferType: 'one_line',
      skeletonCode: 'N = int(input())',
      content: `
  # 덧셈
  ## 문제
  두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.
  ## 입력
  첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)
  ## 출력
  첫째 줄에 A+B를 출력한다.
          `,
      userId: null,
      testCases: ['2 4', '6 12', '10000 21111', '-1234 30'],
      outputs: ['6', '18', '31111', '-1204']
    },
    '2': {
      id: '2',
      title: '작은 별',
      timeout: 1,
      inputTransferType: 'one_line',
      skeletonCode: null,
      content: `
  # 작은 별
  ## 문제
  정수 N을 입력받은 다음 다음과 같이 N줄의 별을 출력하는 프로그램을 작성하시오.
  ## 입력
  첫째 줄에 N이 주어진다. (0 < N < 10)
  ## 출력
  첫째 줄에는 별 1개, 둘째 줄에는 별 2개, ... N번째 줄에는 별 N개를 출력한다.
          `,
      userId: null,
      testCases: ['1', '2', '4', '9'],
      outputs: [
        '*',
        '*\n**',
        '*\n**\n***\n****',
        '*\n**\n***\n****\n*****\n******\n*******\n********\n*********'
      ]
    }
  };
  async getTestCases(id: string): Promise<string[]> {
    return this.problems[id].testCases;
  }
  async validate(
    id: string,
    outputs: string[]
  ): Promise<ProblemProvider.IValidateResult | null> {
    const solutions = this.problems[id].outputs;
    if (solutions.length !== outputs.length) {
      return null;
    }

    return {
      token: null,
      results: solutions.map(
        (solution, i) => solution.trim() === outputs[i].trim()
      )
    };
  }
  async getProblem(id: string): Promise<ProblemProvider.IProblem | null> {
    return this.problems[id];
  }

  async getSubmissions(id: string): Promise<ProblemProvider.ISubmission[]> {
    return this._idToSubmissions[id] ?? [];
  }

  async submit(
    request: ProblemProvider.ISubmissionRequest
  ): Promise<ProblemProvider.ISubmission> {
    if (this._idToSubmissions[request.problemId] === undefined) {
      this._idToSubmissions[request.problemId] = [];
    }

    let status: ProblemProvider.SubmissionStatus;
    if (request.details.every(detail => detail.status === 'AC')) {
      status = 'AC';
    } else if (request.details.some(detail => detail.status === 'RE')) {
      status = 'RE';
    } else if (request.details.some(detail => detail.status === 'OLE')) {
      status = 'OLE';
    } else if (request.details.some(detail => detail.status === 'TLE')) {
      status = 'TLE';
    } else {
      status = 'WA';
    }

    const submission: ProblemProvider.ISubmission = {
      ...request,
      status,
      id: this._idToSubmissions[request.problemId].length.toString(),
      image: '',
      userId: '',
      createdAt: new Date().toISOString(),
      acceptedCount: request.details.filter(detail => detail.status === 'AC')
        .length,
      totalCount: request.details.length
    };

    this._idToSubmissions[request.problemId].push(submission);
    return submission;
  }

  private _idToSubmissions: { [key: string]: ProblemProvider.ISubmission[] } =
    {};
}
