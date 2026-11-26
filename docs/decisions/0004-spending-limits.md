# 0004. Spending limits for live runs

- Status: accepted
- Date: 2026-11-26
- Story 05.

## Context

A live run calls real models and is paid for. Someone who clones the
repo, and the maintainer, must never be surprised by a bill. A defense
can also add calls of its own (a checker model), so counting attacks is
not enough.

## Decision

- **Demo is the default.** A live run needs `CB_MODE=live` and an API
  key in the environment. Without the key the run is a demo, and says
  so.
- **Three limits on every live run:** tokens per run (default
  200,000), dollars per run (default $1.00) and dollars per month
  (default $5.00). The default model is the cheapest one with a
  known price, Claude Haiku 5.5 (story 12).
- **Checked before each call, not after.** Every call goes through one
  meter. It estimates the call on the high side (one token per two
  characters sent, and the full allowed answer back) and refuses the
  call if any limit could be passed. The run then stops, and the run
  file says that it stopped and why. Exit code 3.
- **The monthly total is read from the live run files** in `runs/`. A
  run file that cannot be read stops the command.
- **Only models with a known price can run.** Prices are in the code
  (`pricing.ts`) with the date they were checked.
- **Money is whole millionths of a US dollar**, rounded up.

## Consequences

- A run can stop a little before its cap, never after it.
- The price table must be checked before a live run, and updated when
  a model is added.
- The monthly cap only knows about runs whose run files are in this
  copy of the repo. It is a guard for one machine, not a billing
  system: the vendor's own spending limit stays the real backstop.
