import styled from '@emotion/styled';
import React, { useContext } from 'react';
import { JudgeModel } from '../model';
import { JudgePanel } from '../widgets/JudgePanel';
import { transContext } from '../widgets/JudgeSubmissionArea';
import { SubmissionControl } from './SubmissionControl';
import { SubmissionListSignalWrapper } from './SubmissionList';

export function SubmissionArea(props: {
  panel: JudgePanel;
  model: JudgeModel | null;
}): JSX.Element {
  const trans = useContext(transContext);

  if (props.model === null) {
    return <div>{trans.__('No Submission History Found.')}</div>;
  }

  return (
    <SubmissionAreaContainer>
      <SubmissionAreaList model={props.model} />
      <SubmissionAreaControl panel={props.panel} />
    </SubmissionAreaContainer>
  );
}

const SubmissionAreaContainer = styled.div`
  display: flex;
  border-top: 4px solid var(--jp-border-color0);
  font-size: var(--jp-ui-font-size1);

  height: 100%;
`;

const SubmissionAreaList = styled(SubmissionListSignalWrapper)`
  flex-grow: 1;
  flex-shrink: 1;

  margin-right: 2px;
`;

const SubmissionAreaControl = styled(SubmissionControl)`
  flex-grow: 0;
  flex-shrink: 0;
`;
