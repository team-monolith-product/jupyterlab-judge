import React, { useContext } from 'react';
import { transContext } from '../widgets/JudgeSubmissionArea';
import styled from '@emotion/styled';
import { JudgeModel } from '../model';

export function SubmissionItemWaitStatus(props: {
  className?: string;
  status: JudgeModel.SubmissionStatus;
}): JSX.Element {
  const { status } = props;

  const trans = useContext(transContext);

  if (status.type === 'idle') {
    return <></>;
  }

  if (status.type === 'error') {
    return (
      <SubmissionItemStatusContainer className={props.className}>
        {`🚫 ${status.errorDetails}`}
      </SubmissionItemStatusContainer>
    );
  }

  return (
    <SubmissionItemStatusContainer className={props.className}>
      {status.totalCount === 0
        ? `⌛ ${trans.__('In Progress')}`
        : `⌛ ${trans.__('In Progress')} (${status.runCount}/${
            status.totalCount
          })`}
    </SubmissionItemStatusContainer>
  );
}

const SubmissionItemStatusContainer = styled.span``;
