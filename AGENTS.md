# AGENTS.md — jupyterlab-judge

AI 에이전트와 개발자를 위한 작업 지침입니다. 코딩 철학·리뷰 문화는
jce-codle-react 레포의 AGENTS.md 를 따르며, 이 문서는 이 레포에 특화된
규칙만 담습니다.

## 0. 개요

JupyterLab 에서 문제 풀이·채점(온라인 저지)을 제공하는 확장입니다.

- `.judge` 파일을 여는 문서 타입 + 문제·제출·터미널 패널
- npm 패키지(`jupyterlab-judge`)로는 jcejlext 가 소비하는 라이브러리,
  pip 패키지(`jupyterlab_judge`)로는 lab 에 설치되는 독립 확장
- 문제·제출 데이터는 `IProblemProvider` 토큰으로 주입받습니다.
  실서비스 provider 는 jcejlext 가 제공하고, `HardCodedProblemProvider` 는
  standalone 개발·Galata 테스트용입니다.

## 1. 빌드·테스트

JupyterLab 이 설치된 python env(conda 권장)에서 실행합니다.
lab 버전은 hub 이미지(jce-js-dockerfile `jupyterlab4/requirements-server.txt`)의
핀과 동일하게 맞춥니다.

```bash
jlpm install
jlpm build:check   # tsc --noEmit
jlpm test          # jest — 모델 경계 스위트 포함
jlpm lint:check    # eslint + prettier + stylelint
jlpm build:prod    # federated 빌드
```

통합 테스트(Galata)는 실제 lab 서버와 커널을 부팅합니다.
확장이 dev install(`pip install -e . && jupyter labextension develop .`)된
env 에서 실행해야 합니다.

```bash
cd ui-tests && jlpm install && jlpm test
```

- push 전: `build:check` + `test` + `lint:check` 통과 필수
- PR 생성·수정 후: `build:prod` 와 Galata 까지 통과 확인

## 2. 버전·의존성 규칙

- `@jupyterlab/*` 는 호스트 lab 과 federated singleton 으로 공유됩니다.
  dependencies·resolutions 를 타겟 lab 버전의 monorepo 태그에서 **실측한
  매트릭스**로 고정합니다. 하위 패키지는 lab 과 버전이 다를 수 있으므로
  (apputils·coreutils·observables·rendermime-interfaces·services·toc 등)
  숫자를 추정하지 않습니다.
- lab 버전을 올릴 때 `@jupyter/ydoc` 메이저 동반 상향 여부를 반드시
  확인합니다(`@jupyterlab/cells` 의 요구 버전 기준). `src/model.ts` 가
  ydoc 인터페이스의 **구현자**라 메이저 변경 시 계약 위반이 발생합니다.
- `package.json` 의 `version` 은 수동 변경 금지 — jupyter-releaser
  (prep-release / publish-release 워크플로)가 릴리즈 시 범프하고
  CHANGELOG 도 생성합니다. 배포 대상은 npm + PyPI 입니다.

## 3. 코딩 표준 (이 레포 특칙)

- 주석은 코드 설명이 아닌 비즈니스 배경·기술적 세부·숨은 실패 시나리오
  중심으로 작성합니다.
- ydoc 시그니처를 미러링하는 지점(`transact`·outputs 메서드의
  `origin: any` 등)은 `any` 금지 규칙의 예외 — upstream d.ts 와의
  대조성을 우선합니다.
- 커밋은 conventional commits(영어)로 작성하고, AI 생성 커밋은 `[AI]`
  태그를 붙입니다.
- lint·포맷은 package.json 의 eslint/prettier/stylelint 설정을 따릅니다.

## 4. 구조의 급소

- `src/model.ts` — `JudgeModel` + `YJudge`(YDocument 상속) +
  `YCodeCell`(ISharedCodeCell 구현). lab 의 `CodeCellModel` 에 주입되는
  커스텀 공유 모델이라 **lab 업그레이드 시 가장 먼저 깨지는 지점**입니다.
  `src/__tests__/model.spec.ts` 가 이 접합부의 회귀망이므로, 모델 수정 시
  함께 갱신합니다.
- `ui-tests/` — Galata 스펙 6개가 에디터·실행·제출·채점·터미널·멀티패널을
  실환경으로 검증합니다. 키보드 조작은 darwin/linux 차이를 고려해
  `ControlOrMeta` 같은 크로스 플랫폼 수정자를 사용합니다.
