# 05. `cb run`: demo and live mode, with a budget cap

Phase 1 (core runner). Built on 26 November 2026. One box is open: the
first live run, which waits for Meagan.

## Story

As someone who cloned the repo, I want one command that runs the suite
and can never surprise me with a bill, so trying it is safe.

## Acceptance criteria

- [x] `cb run` runs the suite and writes a run file. (Today the command
      is `npm run cb -- run`.)
- [x] `CB_MODE=demo|live`. Demo replays recorded replies and is the
      default; without an API key the tool is in demo mode whatever
      `CB_MODE` says, and says so.
- [x] A live run has a token limit and a spending cap per run, and a
      monthly cap. It estimates its spend before each call, stops when a
      cap is reached, and records that it stopped and why.
- [x] The command prints which mode it ran in, what it cost, and where
      the run file is.
- [x] Exit codes: 0 done, 1 error, 2 wrong usage, 3 stopped at a cap.
- [ ] The first live run is made and its recordings are committed, so
      demo mode has something to replay. Needs Meagan's OK and her API
      key in her own environment.

## Tests

- [x] Demo mode without keys; live mode refused without keys; a cap that
      stops a run halfway, with the partial run file marked as stopped.
      No test calls a model.

## Notes

- Defaults when built: Claude Opus 5.5, 3 tries per attack, 200,000
  tokens and $1.00 per run, $10.00 per month. Story 12 changed the
  model to Claude Haiku 5.5 and the month to $5.00. All can be set with environment
  variables; `npm run cb -- help` lists them.
- The estimate before a call is on the high side on purpose (one token
  per two characters sent, and the full answer length back), so a run
  stops a little early, never late.
- The monthly total comes from the live run files in `runs/`. If one
  of them cannot be read, the command refuses to run: guessing low
  would let a month go over its cap.
- Only models with a known price can be run, because a run without a
  price cannot be capped.
- A live run records every reply in `recordings/`; a demo run replays
  them. Until the first live run, a demo run ends with "There is no
  recording for this suite yet" and exit code 1.
- Seven first attacks are in `attacks/`, all typed straight to the
  support bot. Their MITRE ATLAS ids are from memory and get checked in
  phase 4 (in the backlog).
