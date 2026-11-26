# 03. Model clients with recording and replay

Phase 1 (core runner). Built on 26 November 2026, before story 02,
because the first target needs the interface.

## Story

As a maintainer, I want every model call to go through one interface
that can record and replay, so tests, CI and the public dashboard never
cost a cent and always give the same answer.

## Acceptance criteria

- [x] One `ModelClient` interface: messages in; reply text, tool calls,
      token counts and the exact model id out.
- [x] A live client over a vendor's official SDK. The first one is for
      Claude models, over Anthropic's SDK; the first model is Claude
      Opus 5.5 (Meagan's choice).
- [x] A recording wrapper that saves each request and reply, keyed by a
      hash of the request, with API keys and headers scrubbed.
- [x] A `RecordedClient` that answers from those files and fails
      loudly on a request it has no recording for. It never falls back
      to a live call.
- [x] Replies are checked with zod before anything else reads them.

## Tests

- [x] Record, then replay: the same reply comes back. An unknown request
      fails. A recording never holds a key. No test calls a model.

## Notes

- Each try of the same request is recorded on its own (`sample`),
  because the runner tries every attack three times.
- The live client sends no fallback model. If the vendor's safety
  system refuses a request, the reply says `refusal`; another model
  never answers in its place, so a result always belongs to the model
  it names.
- Headers and keys never reach a recording: only the suite's own
  request and reply objects are saved, and both are scrubbed first.
- The live client has not been called yet. The first live call waits
  for Meagan's OK.
