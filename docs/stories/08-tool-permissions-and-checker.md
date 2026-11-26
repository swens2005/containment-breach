# 08. Two stronger defenses: tool permissions and a checker model

Phase 2 (defenses and targets). Built on 26 November 2026.

## Story

As a visitor, I want to see defenses that do not rely on the model
obeying its prompt, so I can compare "ask nicely" with "make it
impossible".

## Acceptance criteria

- [x] **Tool permissions:** a call to a tool the app must not misuse
      is not carried out. It is held for the user's approval, and the
      reply says so. In the suite nobody approves, so the call never
      happens.
- [x] **Checker model:** a second model call reads the app's reply and
      answers ALLOW or BLOCK. Anything but a clear ALLOW blocks the
      reply (fail closed).
- [x] The checker is told what the app must protect in words, never
      the secret itself.
- [x] The checker's calls go through the same meter and limits, and
      are recorded and replayed like any other call.
- [x] The five setups have a fixed order: none, hardened prompt, input
      filter, tool permissions, checker model.

## Tests

- [x] Tool permissions remove a forbidden call and keep an allowed
      one. The checker lets a reply through on ALLOW, blocks on BLOCK,
      on nonsense and on a refusal, and its tokens are counted.

## Notes

- The checker reads text an attacker may have shaped, so it can be
  fooled too. That is a finding the dashboard should show, not hide.
- Tool permissions only help an app that has tools: for the support
  bot this setup is the same as no defense.
