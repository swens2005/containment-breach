# 00. Repo, tooling and CI

The first story of phase 0 (setup). Nothing attacks anything yet: this
story makes the place where that work can be checked.

## Story

As an engineer reading this repo, I want every change linted,
type-checked, tested and scanned for secrets before it lands, so I can
trust a security tool that holds itself to its own standard.

## Acceptance criteria

- [x] A public GitHub repo with this layout's start: `packages/core/`,
      `docs/stories/`, `docs/decisions/`, `docs/backlog.md`.
- [x] TypeScript in strict mode, with unchecked index access as an
      error.
- [x] `npm run check` (Oxlint and the formatter, through Vite+),
      `npm run types:check` and `npm test` (Vitest) pass locally.
- [x] CI runs the same three on every push and pull request, plus a
      secret scan (gitleaks) over the whole history.
- [x] Every GitHub Action is pinned to a commit, and Dependabot proposes
      updates for actions and npm packages weekly.
- [x] CI's token can only read the repo.
- [x] A first unit with tests, so the test step proves something: the
      suite version every run file will carry.
- [x] CLAUDE.md holds the rules: public repo, fake secrets only, our own
      targets only, cost caps, no backend.
- [x] `SECURITY.md` says how to report a problem, through GitHub's
      private vulnerability reporting (switched on in the repo's
      settings).
- [ ] A license. (Waits for a choice; MIT is proposed.)

## Not in this story

- The attack, target and run-file formats (story 01).
- The dashboard and its build (phase 3).

## Tests

- [x] Vitest: the suite version is read from package.json and refused
      when it is missing or malformed.
- [x] CI on GitHub is green. (The very first run failed: the gitleaks
      action cannot scan a repo's first push. CI now runs gitleaks
      itself over the whole history.)
