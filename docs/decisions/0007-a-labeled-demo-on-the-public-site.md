# 0007. A labeled demo on the public site, until the first run

- Status: accepted
- Date: 2026-11-26
- Story 15. Replaces one line of ADR 0006.

## Context

No live run is planned for now, so the published dashboard would say
"No recorded run yet" and show nothing. A visitor could not see what
the project does. ADR 0006 kept sample data to local work, so that the
public page could never show a made-up number.

## Decision

- **The published site shows sample data while there is no finished
  live run.** The data is the whole suite run against a stand-in made
  of plain code.
- **It is labeled on every page** as made up and from no model, and
  the stand-in's names are `sample-model-1` and `sample-model-2`. A
  real model's name never stands next to a made-up number.
- **Real data wins by itself.** The publish build picks sample data
  only when `runs/` holds no finished live run. The first committed
  run replaces the demo without a setting to change.
- **`npm run dashboard:build` is unchanged:** real data or none.

## Consequences

- The rule of ADR 0006 becomes: the page never shows a made-up number
  as a result. It may show one as a labeled demo.
- The README says the published numbers are a demo.
- The stand-in follows a fixed rule, so the sample numbers are the
  same on every deploy. They say nothing about any model.
