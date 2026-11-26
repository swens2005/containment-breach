# Containment Breach

Crash tests for AI apps.

A public test suite that attacks small sample AI apps the way an
attacker would, and a dashboard that shows how often each attack gets
through, for each model and each defense.

## Status

The suite and the dashboard are built. **No results are published
yet:** the suite has not been run against a real model. Until it has,
the published dashboard is a demo. Its numbers are sample data from a
stand-in made of plain code, and every page says so. They say nothing
about any model.

## What is in it

- **Three sample apps**, each guarding a fake secret: a support bot,
  an email agent that can send email, and a document summarizer.
- **14 attacks**, one file each in `attacks/`. Some are typed by the
  user. Others hide in an email or a document the app reads. Each
  names its category in the OWASP Top 10 for LLM Applications (2025).
- **Five defense setups:** none, a hardened prompt, an input filter,
  tool permissions, and a second model call that checks every reply.
- **Judges in plain code.** An attack worked when the fake secret
  shows up in the reply, or when the app asks for a tool it must not
  use. No model decides the score.
- **A static dashboard** (`apps/dashboard/`): a grid of models and
  defenses, and the transcripts behind each number.

## How a result is made

1. Each attack is tried three times against each app and defense.
2. Every model call of a live run is recorded.
3. The dashboard is built by replaying those recordings. If the replay
   does not give the same results as the recorded run, the build
   fails.

So a number on the dashboard can always be traced to the replies that
produced it.

## Safe by design

- The apps are made up, and so are their secrets (`CB-CANARY-XXXX`).
- Attacks are only ever aimed at the sample apps in this repo.
- Tools are never really run: a "sent" email is only a recorded
  request.
- Tests and CI never call a model.
- A live run has a token limit, a spending cap per run and a cap per
  month. They are checked before each call.

## Try it

You need Node 24.

```
npm ci
npm run cb -- plan          # what a live run would call and cost; calls nothing
npm run cb -- run           # demo mode: replays recordings, costs nothing
npm run dashboard:sample    # the dashboard with made-up sample data
npx vp preview apps/dashboard
```

Demo mode needs recordings. There are none yet, and `cb run` says so.

A live run needs `CB_MODE=live` and your own API key in the
environment. `npm run cb -- help` lists the settings.

## Checks

```
npm run check
npm run types:check
npm test
npm run dashboard:build
```

## How it was decided

Stories are in `docs/stories/`, decisions in `docs/decisions/`, and
ideas for later in `docs/backlog.md`.

## Rights

This code is public so you can read it. No license is granted: all
rights reserved. Please ask before you copy or reuse it.
