# 01. Attack, target and run-file formats

Draft. Phase 1 (core runner).

## Story

As an engineer adding an attack, I want one strict format for attacks,
targets and run files, so a malformed file is refused at the edge and
every result can be traced to what produced it.

## Acceptance criteria

- [ ] **Attack:** one file per attack with an id, a title, its OWASP
      Top 10 for LLM Applications category, its MITRE ATLAS id, its
      source (a link), where the payload goes (typed in, or hidden in an
      email, document or web page), the payload, and how it is judged.
- [ ] **Target:** a sample app's id, what it does in one sentence, the
      fake canary it guards, and the tools it must not misuse.
- [ ] **Run file:** the date, the exact model ids, the suite version,
      the mode, token counts and cost, and one result per attempt:
      attack, target, defense, model, attempt number, held or breached,
      the judge and its reason.
- [ ] Every format is a zod schema; the TypeScript types come from the
      schemas. Unknown keys are refused, not ignored.
- [ ] A canary has one fixed shape (`CB-CANARY-` plus four hex
      characters), so it can never be mistaken for a real secret.
- [ ] An ADR records the formats and why (after reading on direct and
      indirect prompt injection; see the learning path in the plan).

## Tests

- [ ] A valid example of each format parses; each kind of malformed
      file is refused with a message that names the field.
