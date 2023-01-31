import { UseSignal } from '@jupyterlab/apputils';
import React, { useContext } from 'react';
import { JudgeModel } from '../model';
import { transContext } from '../widgets/JudgeTools';
import { SubmissionListSignalWrapper } from './SubmissionList';
import { SubmissionStatus } from './SubmissionStatus';

export function SubmissionArea(props: {
  model: JudgeModel | null;
}): JSX.Element {
  const trans = useContext(transContext);

  if (props.model === null) {
    return <div>{trans.__('No Submission History Found.')}</div>;
  }

  return (
    <div className="jce-judge-submission-area">
      <UseSignal
        signal={props.model.submissionStatusChanged}
        initialSender={props.model}
        initialArgs={props.model.submissionStatus}
      >
        {(model, submissionStatus) => {
          return <SubmissionStatus status={submissionStatus ?? null} />;
        }}
      </UseSignal>
      <SubmissionListSignalWrapper model={props.model} />
    </div>
  );
}
