export namespace ProblemProvider {
  export interface IProblem {
    id: string;
    title: string;
    content: string;
    timeout: number;
    inputTransferType: 'one_line' | 'all_lines';
    skeletonCode: string | null;
    userId: string | null;
  }

  export interface IValidateResult {
    token: string | null; // null if token is not issued. (or not required by problem provider)
    totalCount: number;
    acceptedCount: number;
  }

  export type SubmissionStatus = 'WA' | 'TLE' | 'AC' | 'OLE' | 'RE' | 'IE';

  export interface ISubmission {
    id: string;
    problemId: string;
    userId: string;
    status: SubmissionStatus;
    code: string;
    cpuTime: number;
    memory: number;
    acceptedCount: number; // 통과한 TC 수
    totalCount: number; // 전체 TC 수
    createdAt: string;
    language: 'python';
    image: string; // Docker Image
    // 631535140228.dkr.ecr.ap-northeast-2.amazonaws.com/jce-ecr-jupyter-python-all-dev:base-2022-04-20T15-12-10
  }

  export interface ISubmissionRequest {
    problemId: string;
    code: string;
    status: SubmissionStatus;
    acceptedCount: number; // 통과한 TC 수
    totalCount: number; // 전체 TC 수
    token: string | null; // to validate status, acceptedCount and totalCount. request null if not required
    cpuTime: number;
    memory: number;
    language: 'python';
  }
}
