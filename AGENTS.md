# AGENTS.md — jupyterlab-judge

Working guide for AI agents and developers. This document holds only the
discipline that code cannot express. For everything else:

- What this extension is, how to build and test it: [README.md](README.md)
- Integration tests (Galata): [ui-tests/README.md](ui-tests/README.md)
- Releasing: [RELEASE.md](RELEASE.md)

## Extension points

- `IProblemProvider` is meant to be provided by the embedding application;
  the bundled `HardCodedProblemProvider` is a fallback used for standalone
  development and Galata tests.

## Versioning discipline

- `@jupyterlab/*` packages are federated singletons: pin dependencies and
  resolutions to the matrix measured from the target lab version's monorepo
  tag — never guess sub-package versions.
- When bumping lab, check whether `@jupyter/ydoc` requires a major bump
  alongside (follow what `@jupyterlab/cells` requires).

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
