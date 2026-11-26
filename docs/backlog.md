# Backlog

Ideas that are out of scope for the story at hand.

- **Rewrite the README when the project is live.** It now holds only the
  pitch line and a status line. The final one needs: what the suite
  does and why, a screenshot of the dashboard and its link, how to run
  the demo in one command, how live runs and their cost caps work, how
  to read a breach rate, how to add an attack or a target, how the
  scout proposes checks, the safety rules (own targets only, fake
  secrets only), and a link to `SECURITY.md` and the rights note.
- Check every attack's MITRE ATLAS id against the ATLAS site
  (phase 4). The first seven were written from memory.
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
- A model judge for fuzzy cases: its format and its ADR (phase 3).
- A monthly schedule for live runs, once the budget allows.
- Whether a security certificate is worth adding, once the project is
  live.
