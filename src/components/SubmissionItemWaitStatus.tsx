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
  console.log(status.type);

  if (status.type === 'idle') {
    return <></>;
  }

  if (status.type === 'error') {
    return (
      <SubmissionItemStatusContainer className={props.className}>
        {`🚫 ${trans.__('Error')}`}
      </SubmissionItemStatusContainer>
    );
  }

  return (
    <SubmissionItemStatusContainer className={props.className}>
      {`⌛ ${trans.__('In Progress')} (${status.runCount}/${
        status.totalCount
      })`}
    </SubmissionItemStatusContainer>
  );
}

const SubmissionItemStatusContainer = styled.span``;
