# 0006. The dashboard: a static site built by replaying a run

- Status: accepted
- Date: 2026-11-26
- Story 11.

## Context

The dashboard is what most visitors see. It must cost nothing to host,
give an attacker nothing to attack, and never show a number that
cannot be checked. ADR 0001 expected a workspace with its own package
for the dashboard.

## Decision

- **A static site in `apps/dashboard/`**, React, built with Vite+.
  `base: './'`, so it runs in any folder of any host.
- **Still one npm package.** React and the fonts are build-time
  packages of the one package; there is no workspace. (This replaces
  that part of ADR 0001: one lockfile and one set of commands turned
  out to be enough.)
- **The data is a replay.** Before the build, a script takes the
  latest live run that finished, replays it from `recordings/` with
  the same code as `cb run`, and collects each attempt's transcript.
  The replay must give the committed run file byte for byte, or the
  build fails. The page cannot show a number or a reply that the
  recordings do not back.
- **The data is one file, `data.json`,** next to the page. The page
  fetches it; it is not typed into the bundle.
- **No run, no numbers.** Without a finished live run the page says so
  and shows no grid.
- **Sample data is for local work only.** `npm run dashboard:sample`
  makes it with a stand-in, not a model; every page then carries a
  "Sample data" strip, and the model names are `sample-model-1` and
  `-2`. The normal build never uses it. (ADR 0007 adds one use: a
  labeled demo on the published site until the first live run.)
- **A strict CSP in a `<meta>` tag:** `default-src 'none'`, then the
  page's own scripts, styles, images, fonts and its data file. No
  inline style or script, no data: URIs, no third party. Fonts
  (JetBrains Mono, Figtree) are served by the site itself.
- **Pages are addresses after `#`** (`#/cell/<model>/<defense>`), so
  a static host needs no rewrite rules and every transcript has a link.
- **Statuses:** contained under 5%, leaking 5 to 25%, breached over
  25%, compared as whole numbers. Each has a word and a lamp; a breach
  also has a stripe.
- **The look** is the approved mock-up: a code-rain canvas in its own
  band (still under reduced motion, hidden from screen readers) over
  black terminal panels.

## Consequences

- The site's build is part of CI, so a change that breaks the replay
  is caught before it is published.
- The pictures in `apps/dashboard/public/img/` are the project's own
  art, made with an image model. They are covered by the same rights
  note as the code.
- A grid cell adds up all three sample apps. The cell's own page shows
  each attack and app apart.
- Trends over time need more than one run's recordings to be kept.
  That is phase 4, and it will need its own decision.
