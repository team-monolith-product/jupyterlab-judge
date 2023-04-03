import styled from '@emotion/styled';
import { UseSignal } from '@jupyterlab/apputils';
import React, { useContext } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { JudgeModel } from '../model';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { factoryContext, transContext } from '../widgets/JudgeSubmissionArea';
import { SubmissionItem } from './SubmissionItem';
import { SubmissionItemWait } from './SubmissionItemWait';

export function SubmissionListSignalWrapper(props: {
  className?: string;
  model: JudgeModel;
}): JSX.Element {
  const queryClient = useQueryClient();
  const { submissionListFactory: SubmissionList } = useContext(factoryContext);

  return (
    <UseSignal
      signal={props.model.problemChanged}
      initialSender={props.model}
      initialArgs={props.model.problem}
    >
      {(_model, problem) => {
        return (
          <UseSignal
            signal={props.model.submissionsChanged}
            initialSender={props.model}
          >
            {(_model, _submissions) => {
              const problemId = problem?.id ?? null;
              if (problemId) {
                queryClient.invalidateQueries(['submissions', problemId]);
              }
              return (
                <UseSignal
                  signal={props.model.submissionStatusChanged}
                  initialSender={props.model}
                  initialArgs={props.model.submissionStatus}
                >
                  {(_model, submissionStatus) => {
                    return (
                      <SubmissionList
                        className={props.className}
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
                        submissionStatus={submissionStatus ?? null}
                      />
                    );
                  }}
                </UseSignal>
              );
            }}
          </UseSignal>
        );
      }}
    </UseSignal>
  );
}
export namespace SubmissionList {
  export interface IOptions {
    className?: string;
    problemId: string | null;
    getSubmissions: () => Promise<ProblemProvider.ISubmission[]>;
    setCode: (code: string) => void;
    submissionStatus: JudgeModel.SubmissionStatus | null;
  }
}

export function SubmissionListImpl(
  props: SubmissionList.IOptions
): JSX.Element {
  const trans = useContext(transContext);

  if (props.problemId === null) {
    return (
      <SubmissionListError className={props.className}>
        ⌛ {trans.__('Loading History')}
      </SubmissionListError>
    );
  }

  const { data, isLoading } = useQuery<ProblemProvider.ISubmission[]>(
    ['submissions', props.problemId],
    props.getSubmissions
  );
  if (isLoading) {
    return (
      <SubmissionListError className={props.className}>
        ⌛ {trans.__('Loading History')}
      </SubmissionListError>
    );
  }

  if (data === undefined) {
    return (
      <SubmissionListError className={props.className}>
        🚫 {trans.__('History Not Available')}
      </SubmissionListError>
    );
  }

  const isSubmissionIdle =
    props.submissionStatus && props.submissionStatus.type === 'idle';

  if (data.length === 0 && isSubmissionIdle) {
    return (
      <NoSubmission className={props.className}>
        {trans.__('Submit your code to get results here.')}
      </NoSubmission>
    );
  }

  return (
    <ListContainer className={props.className}>
      {props.submissionStatus && props.submissionStatus.type !== 'idle' && (
        <ListSubmissionItemWait status={props.submissionStatus} />
      )}
      {data.map(submission => {
        return (
          <ListSubmissionItem
            submission={submission}
            key={submission.id}
            setCode={props.setCode}
          />
        );
      })}
    </ListContainer>
  );
}

const ListContainer = styled.ul`
  padding: 7px 0px 0px 0px;
  margin: 0px;

  overflow-y: auto;

  /* width */
  ::-webkit-scrollbar {
    width: 2px;
  }

  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: var(--jp-border-color0);
    border-radius: 12px;
  }
`;

const ListSubmissionItem = styled(SubmissionItem)``;
const ListSubmissionItemWait = styled(SubmissionItemWait)``;

const SubmissionListError = styled.div`
  text-align: center;
  padding: 5px;
  font-size: var(--jp-ui-font-size2);
`;

const NoSubmission = styled.div`
  padding: 12px;
  font-weight: 700;
  font-size: 12px;
  line-height: 16px;
  color: var(--jp-ui-font-color3);
`;
