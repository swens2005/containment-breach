# 15. A labeled demo until the first run

Phase 3 (dashboard). Built on 26 November 2026.

## Story

As a visitor, I want to see how the dashboard works before there is a
real run, so the page is not empty. And I want to be told that what I
see is a demo, so I do not mistake it for a result.

## Acceptance criteria

- [x] While there is no finished live run, the published site is
      built with sample data: the full suite, run against a stand-in
      that is plain code, not a model.
- [x] Every page then shows a "Sample data" strip that says the
      replies are made up and from no model.
- [x] The stand-in's names are `sample-model-1` and `sample-model-2`.
      No real model's name appears next to a made-up number.
- [x] As soon as a finished live run is committed, the published site
      uses it and the strip goes away. Nobody has to remember a switch.
- [x] `npm run dashboard:build` keeps showing real data only.

## Tests

- [x] The choice between real and sample data: sample only when asked
      for outright, or when allowed and there is no finished live run.

## Notes

- The maintainer's decision of 26 November 2026: the project is a demo
  for now, and no paid run is planned. It replaces one line of ADR
  0006 ("sample data is for local work only"); see ADR 0007.
