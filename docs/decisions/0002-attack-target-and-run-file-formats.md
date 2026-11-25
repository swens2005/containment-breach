# 0002. Attack, target and run-file formats

- Status: proposed
- Date: 2026-11-25
- Story 01.

## Context

Everything the suite does passes through three kinds of data: an
attack, the target it aims at, and the run file that records what
happened. Attack files will later be drafted by the scout from text it
found on the web, and run files are published for anyone to read. Both
are untrusted input and public output at the same time.

Two ideas from the reading on prompt injection shape the attack format:

- **Direct injection:** the attacker is the one talking to the app.
- **Indirect injection:** the attacker never talks to the app. The
  payload hides in something the app reads for an innocent user: an
  email, a document, a web page.

They need different sample apps and different defenses, so an attack
has to say which one it is.

## Decision

- **zod schemas are the formats.** They live in
  `packages/core/src/formats/`; the TypeScript types are inferred from
  them, so the two cannot drift apart.
- **Unknown keys are refused**, at every level (`z.strictObject`). A
  typo in a field name is an error, and nobody can smuggle an extra
  field into a published run file.
- **Attack files are JSON, one per attack.** Loading data must never
  run code, which rules out `.ts` attack files. An attack has an id, a
  title, an OWASP Top 10 for LLM Applications (2025) category, a MITRE
  ATLAS technique id, an https source link, a delivery, a payload and a
  judge.
- **`delivery` says where the payload goes:** `typed` (direct), or
  `email`, `document`, `web-page` (indirect).
- **Judges are plain code for now:** `canary` (the target's canary is
  in the reply) and `forbidden-tool` (the target called a named tool).
  A model judge for fuzzy cases gets its own ADR in phase 3.
- **A canary has one shape:** `CB-CANARY-` plus four uppercase hex
  characters. Nothing that looks like a real key fits it.
- **A target** declares its id, a one-sentence summary, its canary, and
  the tools it must not misuse, each with its rule.
- **A run file** stores a format number (1), the start time in UTC, the
  suite version, the mode (`demo` or `live`), the exact model ids,
  token counts, the cost, and one result per attempt. A result's
  outcome is `held`, `breached` or `error`: a failed model call is
  never counted as held.
- **Exact model ids only.** An alias ending in `latest` is refused,
  because the dashboard's point is to show what changed between model
  versions.
- **Cost is a whole number of millionths of a US dollar**
  (`costMicroUsd`). Money is never a fraction, and one model call costs
  far less than a cent.
- **Results must add up.** A result may only name a model the run
  lists, and the same attempt cannot be recorded twice.
- **One error, every problem.** `parseAttack`, `parseTarget` and
  `parseRunFile` throw a `FormatError` that lists each problem as
  `field: what is wrong`.

## Consequences

- Every edge (attack files, run files, later model replies and scout
  output) is checked the same way.
- JSON payloads with several lines are less pleasant to write by hand
  (`\n`). Safety wins.
- Adding a field means changing the schema, and for run files raising
  the format number, so old run files stay readable on purpose or fail
  loudly.
- The formats check shape, not truth: that an ATLAS id exists, or that
  an attack's forbidden tool belongs to its target, is checked when
  the runner pairs them (story 04).
