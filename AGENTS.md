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

## Verification

We verify with tsc, eslint, prettier, stylelint, jest, pytest, and Galata;
GitHub Actions runs all of them on every PR. Locally you can run the same
checks scoped down (`jlpm build:check`, `jlpm lint:check`, `jlpm test`).
After opening or updating a PR, ensure every GitHub Action succeeds.

## Language

Write everything — comments, commits, PRs — in English.
