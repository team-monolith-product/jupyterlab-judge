import styled from '@emotion/styled';
import React, { useState, useContext } from 'react';
import { JudgePanel } from '../widgets/JudgePanel';
import { transContext } from '../widgets/JudgeTools';

export function SubmissionControl(props: {
  className?: string;
  panel: JudgePanel;
}): JSX.Element {
  const trans = useContext(transContext);
  const [inProgress, setInProgress] = useState(false);

  return (
    <ControlContainer className={props.className}>
      <ControlButton
        onClick={async () => {
          setInProgress(true);
          await props.panel.judge();
          setInProgress(false);
        }}
        disabled={inProgress}
      >
        {trans.__('Submit')}
      </ControlButton>
    </ControlContainer>
  );
}

const ControlContainer = styled.div`
  background: var(--jp-layout-color2);
`;

const ControlButton = styled.button`
  display: block;
  margin-top: 12px;
  margin-left: 20px;
  margin-right: 20px;
  padding: 11px 17px;

  cursor: pointer;

  border: none;

  background: var(--jp-brand-color1);

  /* Shadow-2 */
  box-shadow: 0px 0.15px 0.45px rgba(0, 0, 0, 0.11),
    0px 0.8px 1.8px rgba(0, 0, 0, 0.13);
  border-radius: 8px;

  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 700;
  font-size: 16px;
  line-height: 22px;
  /* identical to box height, or 138% */

  color: var(--jp-ui-inverse-font-color0);

  :disabled {
    background: var(--jp-layout-color3);
    cursor: not-allowed;
  }

  :hover {
    background: var(--jp-brand-color0);
  }
`;
