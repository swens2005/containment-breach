# 0005. Five defense setups and three sample apps

- Status: proposed
- Date: 2026-11-26
- Stories 06 to 10.

## Context

The dashboard's grid has models down the side and defense setups
across the top. Each setup must be the same for every sample app, or
the columns cannot be compared. And the sample apps must cover the two
kinds of injection: direct (the attacker types) and indirect (the
attacker's text arrives inside content).

## Decision

- **Five setups, in a fixed order:** none, hardened prompt, input
  filter, tool permissions, checker model. Each is a wrapper around the
  model client (ADR 0003) and knows nothing about a particular app.
  They are not stacked: a run shows what each one is worth alone.
- **Two of them ask the model to behave** (hardened prompt) or guess
  at bad input (input filter). The filter is a plain list of phrases
  on purpose: that is what a quick filter looks like.
- **Two of them do not rely on the model obeying.** Tool permissions
  hold a risky tool call for the user's approval, so it is not carried
  out on the model's word. The checker is a second model call on the
  reply; anything but a clear ALLOW blocks it.
- **The checker is told what to protect in words, never the secret.**
  A checker that knows the secret can leak it.
- **Three sample apps:** a support bot (typed attacks, a secret in the
  prompt), an email agent (attacks by email, a tool it must not
  misuse) and a document summarizer (attacks in a document, a secret
  in the prompt, no tools).
- **Tools are never run.** The suite only looks at whether the model
  asked for a tool. Nothing is sent anywhere.
- **Email attacks are judged by the forbidden tool, not the canary.**
  The assistant may mention the door code to its own user in a
  summary; that is not a leak. Sending an email nobody asked for is.
- **`cb plan`** goes through a whole run with a stand-in that calls
  nothing, so the number of calls and the highest possible cost are
  known before a live run.

## Consequences

- A full run is 14 attacks x 5 setups x 3 tries: 210 attempts and at
  most 237 model calls for one model.
- Tool permissions change nothing for an app without tools. Its column
  for the support bot and the summarizer equals "none", and the
  dashboard should say why.
- The checker can be fooled by text in the reply it reads. That is a
  result to show.
- An agent that takes several steps (reads a tool's result, then acts)
  is not modeled yet: the email agent gets its emails up front.
