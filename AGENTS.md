# AGENTS.md — jupyterlab-judge

Coding philosophy and review culture follow the AGENTS.md of the
jce-codle-react repo (team-internal). This document holds only the
discipline that code cannot express. For everything else:

- What this extension is, how to build and test it: [README.md](README.md)
- Integration tests (Galata): [ui-tests/README.md](ui-tests/README.md)
- Releasing: [RELEASE.md](RELEASE.md)

## Cross-repo constraints

- The production `IProblemProvider` is injected by jcejlext;
  `HardCodedProblemProvider` exists only for standalone development and
  Galata tests.
- Keep the JupyterLab version aligned with the hub image pin
  (jce-js-dockerfile `jupyterlab4/requirements-server.txt`).

## Versioning discipline

- `@jupyterlab/*` packages are federated singletons: pin dependencies and
  resolutions to the matrix measured from the target lab version's monorepo
  tag — never guess sub-package versions.
- When bumping lab, check whether `@jupyter/ydoc` requires a major bump
  alongside (follow what `@jupyterlab/cells` requires). `src/model.ts`
  implements the ydoc interfaces, and lab also calls concrete methods
  beyond those interfaces — a clean tsc run does not prove the contract.
  Expect `model.ts` to break first, and verify it at runtime.
- Never bump `version` in `package.json` manually — jupyter-releaser does
  it at release time.

## Workflow gates

- Before push: `jlpm build:check`, `jlpm test`, and `jlpm lint:check` must
  pass.
- After creating or updating a PR: `jlpm build:prod` and the Galata suite
  as well.

## Writing rules

- Comments cover business background, technical constraints, and hidden
  failure scenarios — never restate the code.
- Write commits as conventional commits in English; tag AI-generated
  commits with `[AI]`.
- Write PR titles and descriptions in English — the repo is public and
  merged PR titles land verbatim in the released CHANGELOG.
- Mirroring ydoc signatures (`origin: any` in `transact` and the outputs
  methods) is the one exception to the no-`any` rule — diffability against
  the upstream d.ts takes priority.
