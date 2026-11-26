# 11. The dashboard: overview, cell detail, transcripts, library

Phase 3 (dashboard). Built on 26 November 2026, except the boxes that
need a real run or a host.

## Story

As a hiring manager or a client, I want one page that shows where
attacks get through, and lets me click down to the exact reply that
leaked, so I get the point in 30 seconds and can check it myself.

## Acceptance criteria

- [x] A static site in `apps/dashboard/` (React, built with Vite+), in
      the approved green-code look: demo strip, code rain in its own
      band, black terminal panels.
- [x] **Its data is made by replaying the recordings** of the latest
      finished live run. The build fails when the replay does not give
      the committed run file, so the page cannot show a number that
      the recordings do not back.
- [x] **Overview:** a headline sentence written from the run; the
      breach grid (models down, defense setups across) as a real table
      whose cells are links; the three sample apps with their results
      under no defense.
- [x] **Cell detail:** every attack for one model and defense, grouped
      by OWASP category, each try marked held, breached or failed.
- [x] **Transcript:** what the app was sent, what it answered, the
      tool calls, and the judge's verdict with its reason. A leaked
      canary is highlighted.
- [x] **Attack library**, **Defenses** and **How it works / Run it
      yourself** pages.
- [x] Every status is a word and a lamp, and a breach also has a
      stripe: nothing is told by color alone.
- [x] The demo strip names the run it shows, says the page never calls
      a model, and marks a run older than 60 days as old.
- [x] Without a recorded run the page says so plainly and shows no
      grid. Made-up sample data exists for local work only: it is
      labeled as a sample on every page, and the normal build never
      uses it.
- [x] A strict CSP `<meta>`: own scripts, styles, fonts and images
      only. No inline styles, no third-party requests; fonts are
      served from the site itself.
- [x] Keyboard: a skip link, visible focus, focus moves to the page's
      heading after navigating. Works at 320 px. The rain stands still
      under reduced motion and is hidden from screen readers.
- [x] CI builds the site.
- [ ] Real numbers: needs the first live run (story 05).
- [ ] Published at its address: needs the hosting decision.
- [ ] Meagan approves the page's text before it is published.

## Not in this story

- Trends over time and the alarm lamp (phase 4: they need two runs).
- The autopilot tour (phase 6).

## Tests

- [x] Vitest: scores, statuses and the headline from a known run; the
      routes; the data builder with a replay that matches and one that
      does not.
- [x] In a browser, with sample data: every page at desktop width and
      at 320 px, keyboard only, with no console errors or CSP
      violations.
