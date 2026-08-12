# AGENTS.md — jupyterlab-judge

Working guide for AI agents and developers. Coding philosophy and review
culture follow the AGENTS.md of the jce-codle-react repo (team-internal);
this document only covers rules specific to this repo.

## 0. Overview

A JupyterLab extension providing problem solving and grading (online
judge).

- A document type opening `.judge` files + problem/submissions/terminal
  panels
- As an npm package (`jupyterlab-judge`) it is the library consumed by
  jcejlext; as a pip package (`jupyterlab_judge`) it is a standalone
  extension installed into lab
- Problem/submission data is injected through the `IProblemProvider`
  token. The production provider comes from jcejlext;
  `HardCodedProblemProvider` is for standalone development and Galata
  tests.

## 1. Build & Test

Run inside a python env (conda recommended) with JupyterLab installed.
Match the lab version to the hub image pin (jce-js-dockerfile
`jupyterlab4/requirements-server.txt`).

```bash
jlpm install
jlpm build:check   # tsc --noEmit
jlpm test          # jest — includes the model boundary suite
jlpm lint:check    # eslint + prettier + stylelint
jlpm build:prod    # federated build
```

Integration tests (Galata) boot a real lab server and kernel. Run them
in an env where the extension is dev-installed
(`pip install -e . && jupyter labextension develop .`).

```bash
cd ui-tests && jlpm install && jlpm test
```

- Before push: `build:check` + `test` + `lint:check` must pass
- After creating/updating a PR: verify `build:prod` and Galata as well

## 2. Versioning & Dependencies

- `@jupyterlab/*` packages are shared with the host lab as federated
  singletons. Pin dependencies and resolutions to the **matrix measured
  from the target lab version's monorepo tag**. Sub-packages may differ
  from the lab version (apputils, coreutils, observables,
  rendermime-interfaces, services, toc, ...) — never guess the numbers.
- When bumping the lab version, always check whether `@jupyter/ydoc`
  requires a major bump alongside (based on what `@jupyterlab/cells`
  requires). `src/model.ts` is an **implementor** of the ydoc
  interfaces, so a major change breaks the contract.
- Never bump `version` in `package.json` manually — jupyter-releaser
  (prep-release / publish-release workflows) bumps it and generates the
  CHANGELOG at release time. Publishing targets are npm + PyPI.

## 3. Coding Standards (repo-specific)

- Comments should cover business background, technical detail, and
  hidden failure scenarios — not restate the code.
- Write commits as conventional commits (English); tag AI-generated
  commits with `[AI]`.
- Write PR titles and descriptions in English — the repo is public and
  merged PR titles land verbatim in the released CHANGELOG
  (jupyter-releaser).
- Spots mirroring ydoc signatures (`origin: any` in `transact` and the
  outputs methods, etc.) are an exception to the `any` ban —
  diffability against the upstream d.ts takes priority.
- Lint/format follows the eslint/prettier/stylelint config in
  package.json.

## 4. Structural Hot Spots

- `src/model.ts` — `JudgeModel` + `YJudge` (extends YDocument) +
  `YCodeCell` (implements ISharedCodeCell). This custom shared model is
  injected into lab's `CodeCellModel`, making it **the first thing that
  breaks on a lab upgrade**. `src/__tests__/model.spec.ts` is the
  regression net for this seam — update it together with model changes.
- `ui-tests/` — 6 Galata specs verify editor, execution, submission,
  grading, terminal, and multi-panel against a real environment. Use
  cross-platform modifiers like `ControlOrMeta` for keyboard
  interactions to account for darwin/linux differences.
