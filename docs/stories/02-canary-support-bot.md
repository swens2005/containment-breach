# 02. The canary support bot, the first target

Draft. Phase 1 (core runner).

## Story

As a visitor, I want the first sample app to look like a real AI
feature (a support bot that must not give out a discount code), so a
breach is easy to understand without knowing anything about AI.

## Acceptance criteria

- [ ] A support bot target: a system prompt for a made-up shop, with a
      planted canary as the staff-only discount code.
- [ ] It takes a customer message and returns the model's reply through
      the `ModelClient` interface (story 03); it never calls a vendor
      SDK itself.
- [ ] The shop, its products and the code are clearly made up.
- [ ] The target declares itself in the target format (story 01).

## Tests

- [ ] With a recorded reply that holds the canary, the target's output
      holds it; with one that refuses, it doesn't. No model is called.
