# Containment Breach

Crash tests for AI apps. An open-source TypeScript suite that attacks
small sample AI apps the way an attacker would, and a static dashboard
that shows how often each attack gets through, for each model and each
defense, over time.

The build plan ("Containment Breach: Build Plan") and the approved
mock-up of the dashboard are private documents kept outside this repo.
The plan is the source of truth; ask before changing a decision in it.
The dashboard's art is in `../studio-redesign/art/final/cb/` until the
dashboard's first story brings it in.

**This repo is public.** Everything committed here can be read by
anyone: code, docs, commit messages, run files.

## Stack

Node 24, TypeScript (strict), Vite+ (`vp`: Oxlint, formatter, Vitest).
zod for every schema, from story 01. The dashboard (phase 3) is React +
Vite, built to a static site. No server anywhere.

## Commands

```
npm run check          # lint + format check (npm run check:fix to fix)
npm run types:check    # tsc
npm test               # Vitest (vp test), *.test.ts next to the code
```

All of these must pass before committing. CI runs the same set, plus a
secret scan.

## Layout

```
packages/core/      runner, judges, scoring, model clients
packages/targets/   sample apps: support bot, email agent, doc summarizer
attacks/            one file per attack: category, source, payload, judge
defenses/           one file per defense setup
runs/               recorded results, one folder per run (JSON)
apps/dashboard/     static site that reads runs/
scout/              the check proposer
docs/stories/  docs/decisions/  docs/backlog.md
```

One npm package for now (ADR 0001); folders appear with the story that
needs them.

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
- **CI hangs:** a job stuck on `npm ci` is usually GitHub's network:
  cancel and `gh run rerun <id> --failed`. Jobs have `timeout-minutes`.
