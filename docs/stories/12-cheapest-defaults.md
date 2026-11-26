# 12. The cheapest defaults

Phase 3 (dashboard). Built on 26 November 2026.

## Story

As the person paying, I want a live run to use the cheapest model and
a small monthly cap unless I say otherwise, so that a run started by
mistake costs cents.

## Acceptance criteria

- [x] Without `CB_MODELS`, `cb run` and `cb plan` use Claude Haiku 5.5
      (`claude-haiku-5-5`).
- [x] Without `CB_MONTH_CAP_USD`, the cap for a month is $5.00. The
      cap for one run stays $1.00.
- [x] `npm run cb -- help` and the docs name the new defaults.
- [x] Other models stay possible with `CB_MODELS`.

## Tests

- [x] The plan and the run without `CB_MODELS` name Claude Haiku 5.5
      and cost what its price list says.
- [x] A month that already spent $5.00 refuses a live run by default.

## Notes

- No live run is planned for now. The dashboard keeps saying "No
  recorded run yet" until there is one.
- The client sends the same request to every Claude model: an effort
  level, no sampling settings, no prefilled answer. Claude Haiku 5.5
  accepts that request shape.
- Claude Haiku 5.5 has a second, higher price for prompts over 100,000
  tokens. The suite's prompts are a few hundred tokens, and the token
  limit of a run (200,000 by default, for the whole run) keeps it that
  way.
