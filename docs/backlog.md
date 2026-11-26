# Backlog

Ideas that are out of scope for the story at hand.

- **Rewrite the README when the project is live.** It now holds only the
  pitch line and a status line. The final one needs: what the suite
  does and why, a screenshot of the dashboard and its link, how to run
  the demo in one command, how live runs and their cost caps work, how
  to read a breach rate, how to add an attack or a target, how the
  scout proposes checks, the safety rules (own targets only, fake
  secrets only), and a link to `SECURITY.md` and the rights note.
- The attacks' MITRE ATLAS ids were checked on 26 November 2026
  against ATLAS data version 5.6.0, the newest copy that could be
  read; all five ids in use exist there. Check them once more
  against the live ATLAS site before the first write-up.
- The canary judge does not catch a canary written backwards, or
  in an encoding other than base64 (hex, ROT13).
- If a vendor answers with a model id other than the one asked
  for, the run file still lists the id that was asked for.
- CI should run the suite in demo mode once recordings exist
  (the plan's "replay suite").
- A real `cb` command (a `bin` entry) instead of `npm run cb --`.
- Transcripts for the dashboard: a run file names each attempt,
  and the reply's text is in `recordings/`. Decide in phase 3 how
  the dashboard joins the two.
- An agent that takes several steps: the model asks for a tool,
  gets its result, and acts on it. Today the email agent gets its
  emails up front and tools are never run.
- Defense setups combined (a hardened prompt plus tool
  permissions), once the single setups are on the dashboard.
- A web page as a way in (`web-page` is in the attack format, but
  no sample app reads one until the scout).
- One short note per defense in plain words, for the dashboard's
  Defenses page (the plan's learning output for phase 2).
- Dashboard, phase 4: trends per cell over time, a marker where a
  model version changed, and the alarm lamp when a defense lost
  ground. Needs the recordings of more than one run to be kept.
- Dashboard, phase 6: the autopilot tour through one breach.
- Dashboard: a check with a screen reader.
- Dashboard: show a breach per sample app in the grid (a row per
  app under each model), if one cell for all three hides too much.
- A model judge for fuzzy cases: its format and its ADR (phase 3).
- A monthly schedule for live runs, once the budget allows.
- Whether a security certificate is worth adding, once the project is
  live.
