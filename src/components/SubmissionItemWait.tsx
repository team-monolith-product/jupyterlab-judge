import styled from '@emotion/styled';
import React from 'react';
import { JudgeModel } from '../model';
import { SubmissionItemWaitStatus } from './SubmissionItemWaitStatus';

export function SubmissionItemWait(props: {
  className?: string;
  status: JudgeModel.SubmissionStatus;
}): JSX.Element {
  return (
    <SubmissionItemContainer className={props.className}>
      <ItemStatus
        status={props.status}
      />
    </SubmissionItemContainer>
  );
}

const SubmissionItemContainer = styled.li`
  display: flex;
  padding: 5px 12px;
  height: 16px;

  font-family: 'Noto Sans KR';
  font-style: normal;
  font-size: 12px;
  line-height: 16px;
`;


const ItemStatus = styled(SubmissionItemWaitStatus)`
  height: 16px;
  flex-grow: 0;
  flex-shrink: 0;

  width: 101px;
  margin-right: 8px;
`;
