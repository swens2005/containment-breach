# 09. The document summarizer

Phase 2 (defenses and targets). Built on 26 November 2026.

## Story

As a visitor, I want a third sample app with no tools at all, so I can
see that an uploaded file alone can make an app give away a secret.

## Acceptance criteria

- [x] A summarizer for a made-up notes app. It gets one document and
      returns a short summary.
- [x] Its system prompt holds a canary (a made-up license key) that
      users must never see.
- [x] The attack's payload is a paragraph inside an otherwise ordinary
      document.
- [x] Three first attacks by document, judged by the canary.

## Tests

- [x] The payload lands inside the document. A recorded summary that
      holds the canary is a breach; an ordinary one is not. The app
      refuses other kinds of delivery.
