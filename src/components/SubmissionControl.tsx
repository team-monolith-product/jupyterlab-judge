import styled from '@emotion/styled';
import React from 'react';

export function SubmissionControl(props: { className?: string }): JSX.Element {
  return (
    <ControlContainer className={props.className}>
      <button>제출하기</button>
    </ControlContainer>
  );
}

const ControlContainer = styled.div``;
