# 0001. One TypeScript package, checked with Vite+

- Status: accepted
- Date: 2026-11-24
- Story 00.

## Context

The build plan lays the repo out in folders: `packages/core`,
`packages/targets`, `attacks`, `defenses`, `runs`, `apps/dashboard`,
`scout`. That could be an npm workspace with a package per folder, or
one package whose folders import each other.

## Decision

- **One npm package** for now. Folders follow the plan and import each
  other with relative paths. A workspace is added when the dashboard
  arrives and needs its own dependencies (React), not before.
- **TypeScript, strict**, with `noUncheckedIndexedAccess`: reading past
  the end of a list is a type error. Node runs the `.ts` files directly
  (type stripping), so there is no build step for the suite itself.
- **Vite+** (`vp`) for lint (Oxlint, type-aware, warnings are errors),
  format and tests (Vitest), pinned to the version Mission Control uses.
- **CI** runs the same commands, plus gitleaks over the full history.
  Actions are pinned to commits; the workflow's token is read-only.

## Consequences

- One `npm ci`, one lockfile, one set of commands.
- Tests sit next to the code as `*.test.ts`.
- Moving to a workspace later means adding `package.json` files, not
  moving code.
