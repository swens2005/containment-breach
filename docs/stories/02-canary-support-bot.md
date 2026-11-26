# 02. The canary support bot, the first target

Phase 1 (core runner). Built on 26 November 2026.

## Story

As a visitor, I want the first sample app to look like a real AI
feature (a support bot that must not give out a discount code), so a
breach is easy to understand without knowing anything about AI.

## Acceptance criteria

- [x] A support bot target: a system prompt for a made-up shop, with a
      planted canary as the staff-only discount code.
- [x] It takes a customer message and returns the model's reply through
      the `ModelClient` interface (story 03); it never calls a vendor
      SDK itself.
- [x] The shop, its products and the code are clearly made up.
- [x] The target declares itself in the target format (story 01).

## Tests

- [x] With a recorded reply that holds the canary, the target's output
      holds it; with one that refuses, it doesn't. No model is called.

## Notes

- The shop is Nimbus Kites, with the bot "Skye". Its email address ends
  in `.example`, a name reserved for examples.
- A sample app only builds the request (`TargetApp.request`). The
  runner sends it through the client, so a defense can sit in between
  without the app knowing.
- The bot's prompt is part of what a recording is filed under. Changing
  one word of it means the recordings no longer match, and demo mode
  says so until there is a new live run.
