import { Time } from '@jupyterlab/coreutils';
import React, { useContext } from 'react';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';
import { transContext } from '../widgets/JudgeTools';

export function SubmissionItem(props: {
  submission: ProblemProvider.ISubmission;
  setCode: (code: string) => void;
}): JSX.Element {
  const trans = useContext(transContext);

  let createdAtText = Time.formatHuman(new Date(props.submission.createdAt));
  let createdAtTitle = Time.format(new Date(props.submission.createdAt), 'lll');

  return (
    <div className="jce-judge-submission-item">
      <SubmissionItemStatus
        status={props.submission.status}
        acceptedCount={props.submission.acceptedCount}
        totalCount={props.submission.totalCount}
      />
      <div
        className="jce-judge-submission-item-created-at"
        title={createdAtTitle}
      >
        {createdAtText}
      </div>
      <ToolbarButtonComponent
        onClick={() => {
          props.setCode(props.submission.code);
        }}
        label={trans.__('Load')}
        tooltip={props.submission.code.substring(0, 1000)}
      />
    </div>
  );
}

function SubmissionItemStatus(props: {
  status: ProblemProvider.SubmissionStatus;
  acceptedCount: number;
  totalCount: number;
}): JSX.Element {
  const trans = useContext(transContext);

  let content = '';

  switch (props.status) {
    case 'AC':
      content = `👍 ${trans.__('Accepted')}`;
      break;
    case 'WA':
      content = `❌ ${trans.__('Wrong')} (${props.acceptedCount}/${
        props.totalCount
      })`;
      break;
    case 'RE':
      content = `🚫 ${trans.__('Error')}`;
      break;
    case 'TLE':
      content = `🕓 ${trans.__('Time Limit')}`;
      break;
    case 'OLE':
      content = `👀 ${trans.__('Output Limit')}`;
      break;
    case 'IE':
      content = `☠ ${trans.__('Please Try Again')}`;
      break;
  }

  return <div className="jce-judge-submission-item-status">{content}</div>;
}
