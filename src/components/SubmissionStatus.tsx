import React, { useContext } from 'react';
import { JudgeModel } from '../model';
import { transContext } from '../widgets/JudgeTools';

export function SubmissionStatus(props: {
  status: JudgeModel.SubmissionStatus | null;
}): JSX.Element {
  const trans = useContext(transContext);

  const status = props.status ?? {
    inProgress: false,
    runCount: 0,
    totalCount: 0
  };

  return (
    <div className="jce-judge-submission-status">
      {status.inProgress
        ? `⌛ ${trans.__('In Progress')} (${status.runCount}/${
            status.totalCount
          })`
        : `✔ ${trans.__('No Submissions Judging')}`}
    </div>
  );
}
