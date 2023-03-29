import { ProblemProvider } from '../problemProvider/problemProvider';
import React, { useContext } from 'react';
import { transContext } from '../widgets/JudgeSubmissionArea';
import styled from '@emotion/styled';

export function SubmissionItemStatus(props: {
  className?: string;
  status: ProblemProvider.SubmissionStatus;
  acceptedCount: number;
  totalCount: number;
}): JSX.Element {
  const trans = useContext(transContext);

  let content = '';
  let title = '';

  switch (props.status) {
    case 'AC':
      content = `👍 ${trans.__('Accepted')}`;
      break;
    case 'WA':
      content = `❌ ${trans.__('Wrong')}`;
      title = `(${props.acceptedCount}/${props.totalCount})`;
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

  return (
    <SubmissionItemStatusContainer className={props.className} title={title}>
      {content}
    </SubmissionItemStatusContainer>
  );
}

const SubmissionItemStatusContainer = styled.span``;
