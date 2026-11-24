# 03. Model clients with recording and replay

Draft. Phase 1 (core runner).

## Story

As a maintainer, I want every model call to go through one interface
that can record and replay, so tests, CI and the public dashboard never
cost a cent and always give the same answer.

## Acceptance criteria

- [ ] One `ModelClient` interface: messages in; reply text, tool calls,
      token counts and the exact model id out.
- [ ] A live client over a vendor's official SDK. Which vendors and
      models is an open question in the plan; the first one is enough
      for this story.
- [ ] A recording wrapper that saves each request and reply, keyed by a
      hash of the request, with API keys and headers scrubbed.
- [ ] A `RecordedClient` that answers from those files and fails
      loudly on a request it has no recording for. It never falls back
      to a live call.
- [ ] Replies are checked with zod before anything else reads them.

## Tests

- [ ] Record, then replay: the same reply comes back. An unknown request
      fails. A recording never holds a key. No test calls a model.
