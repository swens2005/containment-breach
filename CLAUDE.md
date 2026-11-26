# Containment Breach

Crash tests for AI apps. A public TypeScript suite that attacks
small sample AI apps the way an attacker would, and a static dashboard
that shows how often each attack gets through, for each model and each
defense, over time.

The build plan ("Containment Breach: Build Plan") and the approved
mock-up of the dashboard are private documents kept outside this repo.
The plan is the source of truth; ask before changing a decision in it.
The dashboard's art is in `apps/dashboard/public/img/`.

**This repo is public.** Everything committed here can be read by
anyone: code, docs, commit messages, run files. It has no license on
purpose (all rights reserved): never call it open source, and don't
add a license without asking.

## Stack

Node 24, TypeScript (strict), Vite+ (`vp`: Oxlint, formatter, Vitest).
zod for every schema, from story 01. The dashboard (phase 3) is React +
Vite, built to a static site. No server anywhere.

## Commands

```
npm run check          # lint + format check (npm run check:fix to fix)
npm run types:check    # tsc
npm test               # Vitest (vp test), *.test.ts next to the code
npm run cb -- run      # the suite; demo mode unless CB_MODE=live and a key
npm run cb -- plan     # calls and highest cost of a live run; calls nothing
npm run dashboard:build   # the static site, from the latest recorded run
npm run dashboard:sample  # the same with made-up sample data, for local work
```

All of these must pass before committing. CI runs the same set, plus a
secret scan.

## Layout

```
packages/core/      runner, judges, scoring, model clients
packages/targets/   sample apps: support bot, email agent, doc summarizer
packages/cli/       the `cb` command
attacks/            one file per attack: category, source, payload, judge
recordings/         recorded model replies that demo mode replays
defenses/           one file per defense setup
runs/               recorded results, one folder per run (JSON)
apps/dashboard/     static site that reads runs/
scout/              the check proposer
docs/stories/  docs/decisions/  docs/backlog.md
```

One npm package, the dashboard included (ADRs 0001 and 0006); folders
appear with the story that needs them.

## Workflow

1. Each user story goes in `docs/stories/NN-title.md` with acceptance
   criteria, before any code.
2. Implement one story at a time, with tests, in small commits.
3. Review each story's diff separately (correctness, security,
   accessibility) and note findings in the commit message.
4. Record significant decisions as ADRs in `docs/decisions/NNNN-title.md`.
5. Out-of-scope ideas go into `docs/backlog.md`.

## Rules

- **Public repo.** No personal data, nothing from private repos, and no
  private links in code, docs or commit messages. Meagan approves public
  text (README, dashboard copy, write-ups) before it goes out.
- **Secrets.** API keys live only in GitHub secrets and local
  environment variables. Never read, print or commit a real `.env`
  file. Run files are scrubbed before they are written.
- **Fake secrets only.** Sample apps guard clearly fake canary strings
  (like `CB-CANARY-7F3A`). Nothing in this repo is a real credential.
- **Our own targets only.** Attacks aim at the sample apps in this repo.
  No "test your own URL" feature, and no code that sends attacks to an
  address someone types in.
- **Not a jailbreak collection.** Attacks try to make our sample apps
  leak planted canaries or misuse their own tools. No prompts for making
  models produce harmful content.
- **Not a verdict on vendors.** A small sample of cheap models; the
  dashboard says so wherever it shows a number.
- **Cost.** A live run has a token limit, a spending cap and a monthly
  cap, and stops when it reaches one. Tests and CI never call a model:
  they replay recorded replies. Ask Meagan before any live run.
- **Untrusted input is checked at every edge** with zod: attack files,
  run files, model replies, anything the scout fetches.
- **No backend.** The public site is static, with a strict CSP `<meta>`
  and no third-party scripts. Never add a library that injects `<style>`
  or `<script>` tags at runtime.
- Ask before anything hard to undo, or that touches hosting, GitHub
  settings or secrets.
- Target WCAG 2.2 AA: keyboard support, contrast, 320 px width, reduced
  motion. Status is always written out, never shown by color alone.
- Write American English everywhere.

## Patterns to reuse

- **Formats (ADR 0002):** the zod schemas in
  `packages/core/src/formats/` are the formats; types are inferred
  from them. Parse untrusted input with `parseAttack`, `parseTarget`
  or `parseRunFile` (they throw a `FormatError` that names each
  field). New objects use `z.strictObject`; ids use `idSchema`;
  money is a whole number (`costMicroUsd`).

- **Model calls (ADR 0003):** everything goes through `ModelClient`
  (`packages/core/src/model/`); only that folder imports a vendor
  SDK. Tests use `recordedClient` with a `memoryStore`, or a
  scripted stand-in. The live client sends no fallback model.
- **Sample apps** implement `TargetApp` and only build a request;
  add new ones to `packages/targets/index.ts`.
- **Defenses** implement `Defense`: a `ModelClient` wrapped around
  another one. The five setups and their order are in
  `defenses.ts` (ADR 0005). Tools are never run: the suite only
  looks at whether the model asked for one.
- **Attacks by email** use the forbidden-tool judge, not the canary
  judge (ADR 0005 says why).
- **Limits (ADR 0004):** every call passes the meter in
  `meter.ts`. A new model needs a price in `pricing.ts` first.
- **Writing files:** scrub with `scrubText` / `scrubDeep` before
  anything from a model or an error is written down.
- **Changing an attack or a sample app's prompt** makes the
  recordings in `recordings/` stale: demo mode then fails on
  purpose until a new live run (which Meagan starts).

- **Dashboard (ADR 0006):** its data is `public/data.json`, written
  by `apps/dashboard/scripts/build-data.ts` as a replay of the
  latest finished live run; never edit numbers by hand. Pages are
  hash routes in `lib/route.ts`; scores in `lib/score.ts`. No
  `style` props and no inline styles (the CSP forbids them): use
  classes in `styles.css`, with the colors of its `:root`. Every
  status needs its word. To look at it: `npm run dashboard:sample`,
  then `npx vp preview apps/dashboard --port 8177`.

## Gotchas (learned in Mission Control)

- **Pinned actions:** CI pins every GitHub Action to a commit. Look the
  commit up (`gh api repos/<owner>/<action>/git/ref/tags/<tag>`); never
  write one from memory.
- **Secret scan:** gitleaks in CI reads any long hex string (a hash too)
  as a secret. Canaries are short and marked fake on purpose. To allow a
  false positive, add a narrow `.gitleaks.toml` exception.
- **Shell:** a local hook blocks any command whose text contains `.env`
  (including `import.meta.env`); edit such files with the file editor.
  Heredocs with quotes or backslashes break in Git Bash; write files
  with the editor.
- **CI watching:** after pushing, wait for the _new_ run id before
  `gh run watch`.
- **Hidden labels in a wide table:** a visually hidden (absolutely
  placed) label inside a table that scrolls sideways widens the
  whole page unless the scroll box is `position: relative`
  (`.grid-wrap`).
- **CI hangs:** a job stuck on `npm ci` is usually GitHub's network:
  cancel and `gh run rerun <id> --failed`. Jobs have `timeout-minutes`.
