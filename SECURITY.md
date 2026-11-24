# Security

## Reporting a problem

Please report a security problem in private, not in a public issue.

1. Open this repo's **Security** tab on GitHub.
2. Choose **Report a vulnerability**.
3. Say what you found and how to reproduce it.

You will get an answer within a week. Please give us time to fix the
problem before you write about it in public.

## What counts

- A real secret in this repo, its history or its recorded runs.
- A way to make the tools here attack something other than this repo's
  own sample apps.
- A way to make a run spend more than its caps allow.
- A problem in the dashboard that could harm the people who visit it.

## What does not count

The sample apps under `packages/targets/` are weak on purpose: breaking
them is what this project measures. Every secret in them is fake. A new
attack that gets through is welcome as a normal issue or pull request.
