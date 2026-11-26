# 10. `cb plan`: what a live run would do, before it does it

Phase 2 (defenses and targets). Built on 26 November 2026.

## Story

As the person paying, I want to see how many calls a live run would
make and the most it could cost, without calling a model, so I can set
the caps before I start.

## Acceptance criteria

- [x] `cb plan` prints the number of attempts and model calls, the
      most tokens they could use, and the most they could cost, for the
      models in `CB_MODELS`.
- [x] It calls no model, needs no key and writes nothing.
- [x] It counts the calls defenses add or save (the checker's second
      call, the filter's blocked calls).
- [x] It says whether the current caps would let the run finish.
- [x] `cb run` uses all five defense setups.

## Tests

- [x] The plan for the repo's own attacks matches a count made by
      hand, makes no live call and writes no file.

## Notes

- The estimate is the same high-side guess the limits use, so the real
  cost is lower.
