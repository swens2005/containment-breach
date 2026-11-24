# 05. `cb run`: demo and live mode, with a budget cap

Draft. Phase 1 (core runner).

## Story

As someone who cloned the repo, I want one command that runs the suite
and can never surprise me with a bill, so trying it is safe.

## Acceptance criteria

- [ ] `cb run` runs the suite and writes a run file.
- [ ] `CB_MODE=demo|live`. Demo replays recorded replies and is the
      default; without an API key the tool is in demo mode whatever
      `CB_MODE` says, and says so.
- [ ] A live run has a token limit and a spending cap per run, and a
      monthly cap. It estimates its spend before each call, stops when a
      cap is reached, and records that it stopped and why.
- [ ] The command prints which mode it ran in, what it cost, and where
      the run file is.
- [ ] Exit codes: 0 done, 1 error, 2 wrong usage, 3 stopped at a cap.

## Tests

- [ ] Demo mode without keys; live mode refused without keys; a cap that
      stops a run halfway, with the partial run file marked as stopped.
      No test calls a model.
