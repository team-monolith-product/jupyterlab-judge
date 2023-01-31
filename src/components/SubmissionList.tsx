import { UseSignal } from '@jupyterlab/apputils';
import React, { useContext } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { JudgeModel } from '../model';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { transContext } from '../widgets/JudgeTools';
import { SubmissionItem } from './SubmissionItem';

export function SubmissionListSignalWrapper(props: {
  model: JudgeModel;
}): JSX.Element {
  const queryClient = useQueryClient();

  return (
    <UseSignal
      signal={props.model.problemChanged}
      initialSender={props.model}
      initialArgs={props.model.problem}
    >
      {(model, problem) => {
        return (
          <UseSignal
            signal={props.model.submissionsChanged}
            initialSender={props.model}
          >
            {(model, submissions) => {
              const problemId = problem?.id ?? null;
              if (problemId) {
                queryClient.invalidateQueries(['submissions', problemId]);
              }
              return (
                <SubmissionList
                  problemId={problemId}
                  getSubmissions={async (): Promise<
                    ProblemProvider.ISubmission[]
                  > => {
                    const submissions = await props.model.submissions();
                    return submissions ?? [];
                  }}
                  setCode={(code: string) => {
                    props.model.source = code;
                  }}
                />
              );
            }}
          </UseSignal>
        );
      }}
    </UseSignal>
  );
}

function SubmissionList(props: {
  problemId: string | null;
  getSubmissions: () => Promise<ProblemProvider.ISubmission[]>;
  setCode: (code: string) => void;
}): JSX.Element {
  const trans = useContext(transContext);

  if (props.problemId === null) {
    return (
      <div className="jce-judge-submission-list-error">
        🚫 {trans.__('History Not Available')}
      </div>
    );
  }

  const { data, isLoading } = useQuery<ProblemProvider.ISubmission[]>(
    ['submissions', props.problemId],
    props.getSubmissions
  );
  if (isLoading) {
    return (
      <div className="jce-judge-submission-list-error">
        ⌛ {trans.__('Loading History')}
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="jce-judge-submission-list-error">
        🚫 {trans.__('History Not Available')}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="jce-judge-submission-list-error">
        🙅‍♀️ {trans.__('No History')}
      </div>
    );
  }

  return (
    <>
      {data.map(submission => {
        return (
          <SubmissionItem
            submission={submission}
            key={submission.id}
            setCode={props.setCode}
          />
        );
      })}
    </>
  );
}
