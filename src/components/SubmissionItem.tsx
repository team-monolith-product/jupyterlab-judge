import { Time } from '@jupyterlab/coreutils';
import React, { useContext } from 'react';
import { ProblemProvider } from '../problemProvider/problemProvider';
import { transContext } from '../widgets/JudgeSubmissionArea';
import styled from '@emotion/styled';
import { SubmissionItemStatus } from './SubmissionItemStatus';

export function SubmissionItem(props: {
  className?: string;
  submission: ProblemProvider.ISubmission;
  setCode: (code: string) => void;
}): JSX.Element {
  const trans = useContext(transContext);

  const createdAtText = Time.formatHuman(new Date(props.submission.createdAt));
  const createdAtTitle = Time.format(
    new Date(props.submission.createdAt),
    'lll'
  );

  return (
    <SubmissionItemContainer className={props.className}>
      <ItemStatus
        status={props.submission.status}
        acceptedCount={props.submission.acceptedCount}
        totalCount={props.submission.totalCount}
      />
      <ItemLoad
        onClick={() => {
          props.setCode(props.submission.code);
        }}
        title={props.submission.code.substring(0, 1000)}
      >
        {trans.__('Load this submission')}
      </ItemLoad>
      <ItemTime title={createdAtTitle}>{createdAtText}</ItemTime>
    </SubmissionItemContainer>
  );
}

const SubmissionItemContainer = styled.li`
  display: flex;
  padding: 5px 12px;
  height: 16px;

  font-family: var(--jp-ui-font-family);
  font-style: normal;
  font-size: 12px;
  line-height: 16px;
`;

const ItemStatus = styled(SubmissionItemStatus)`
  height: 16px;
  flex-grow: 0;
  flex-shrink: 0;

  width: 101px;
  margin-right: 8px;
`;

const ItemLoad = styled.button`
  height: 16px;
  flex-grow: 0;
  flex-shrink: 0;

  all: unset;
  cursor: pointer;

  font-family: var(--jp-ui-font-family);
  font-style: normal;
  font-weight: 700;
  font-size: 12px;
  line-height: 16px;
  color: var(--jp-brand-color1);
`;

const ItemTime = styled.span`
  height: 16px;
  flex-grow: 1;
  flex-shrink: 1;

  text-align: right;

  font-family: var(--jp-ui-font-family);
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;

  color: var(--jp-ui-font-color3);
`;
