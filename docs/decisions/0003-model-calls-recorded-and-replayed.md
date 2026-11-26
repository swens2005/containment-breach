# 0003. Model calls: one interface, recorded and replayed

- Status: proposed
- Date: 2026-11-26
- Stories 02, 03 and 04.

## Context

The suite calls language models, which cost money and answer
differently each time. Tests, CI and the public dashboard must cost
nothing and always show the same thing. And a result is only worth
publishing if it is certain which model gave it.

## Decision

- **One `ModelClient` interface** for every model call. A sample app
  only builds a request; the runner sends it. Only
  `packages/core/src/model/` may import a vendor SDK.
- **Three clients.** A live client per vendor (the first is for Claude
  models, over Anthropic's official SDK). A recording wrapper that
  saves each live call. A recorded client that answers from those
  files.
- **A recording is filed under a hash** of the whole request plus the
  number of the try. The same attack is tried three times, and each
  try has its own recording.
- **The recorded client never calls a model.** A request without a
  recording is an error that stops the run. Demo mode cannot cost
  anything, and it cannot quietly show stale results either: change an
  attack or a sample app's prompt, and the demo fails until there is a
  new live run.
- **No fallback model.** If a vendor's safety system refuses a request,
  the reply is recorded as a refusal. Another model never answers in
  its place.
- **Exact model ids**, and the reply's token counts, are part of every
  recording.
- **Scrubbed before writing.** Recordings and run files hold only the
  suite's own objects, never headers. Anything shaped like a real key,
  and every secret in the environment, is replaced before a file is
  written. Canaries stay readable: they are the point.
- **Defenses wrap the client.** A defense is a `ModelClient` around
  another one, so it can change a request, block it, or check a reply.
- **Judges are plain code** and run on the reply after the defense.

## Consequences

- No test and no CI job can reach a model, by construction.
- Recordings must be committed for demo mode to work, and re-made
  after any change to an attack, a prompt or a model. That is the
  price of results that are always genuine.
- A refusal by a safety system counts as "held": the app did not leak.
  The run file's reason says it was a refusal, so it can be told apart.
- Thinking blocks are not recorded: they are not part of what the app
  shows anyone.
