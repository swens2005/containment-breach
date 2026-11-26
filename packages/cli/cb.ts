import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadAttacks } from '../core/src/attacks.ts';
import { noDefense } from '../core/src/defense.ts';
import { parseRunFile, type RunFile } from '../core/src/formats/run-file.ts';
import { FormatError, modelIdSchema } from '../core/src/formats/shared.ts';
import type { Limits } from '../core/src/meter.ts';
import type { ModelClient } from '../core/src/model/client.ts';
import {
    fileStore,
    MissingRecordingError,
    recordedClient,
    recordingClient,
} from '../core/src/model/recordings.ts';
import { costMicroUsd, formatUsd, hasPrice } from '../core/src/pricing.ts';
import { formatRunFile, runSuite } from '../core/src/runner.ts';
import { breachPercent, scoreCells } from '../core/src/scoring.ts';
import { secretsIn } from '../core/src/scrub.ts';
import { suiteVersion } from '../core/src/suite.ts';
import { targets } from '../targets/index.ts';

/** Everything the command touches outside itself. Tests pass stand-ins. */
export interface Io {
    env: Readonly<Record<string, string | undefined>>;
    /** The repo's folder: `attacks/`, `recordings/` and `runs/` live in it. */
    root: string;
    now: () => Date;
    print: (line: string) => void;
    /** Makes the live client. Only called in live mode. */
    liveClient: () => ModelClient;
}

export const EXIT = { done: 0, error: 1, usage: 2, stoppedAtCap: 3 } as const;

const USAGE = `Usage: cb run [--out <folder>]

Runs the suite against the sample apps and writes a run file.

Settings (environment variables):
  CB_MODE           demo (default) or live. Without ANTHROPIC_API_KEY
                    the mode is always demo.
  CB_MODELS         exact model ids, comma-separated (default claude-opus-5-5)
  CB_ATTEMPTS       tries per attack, 1 to 10 (default 3)
  CB_TOKEN_LIMIT    most tokens for one live run (default 200000)
  CB_RUN_CAP_USD    most one live run may cost (default 1.00)
  CB_MONTH_CAP_USD  most all live runs of a month may cost (default 10.00)

Exit codes: 0 done, 1 error, 2 wrong usage, 3 stopped at a cap.`;

/** A setting that cannot be used. */
class UsageError extends Error {
    override name = 'UsageError';
}

/** "1.50" → 1_500_000. Whole-number maths only; no floats near money. */
export function usdToMicro(text: string): number | undefined {
    const match = /^(\d{1,6})(?:\.(\d{1,6}))?$/.exec(text.trim());

    if (match === null) {
        return undefined;
    }

    return (
        Number(match[1]) * 1_000_000 + Number((match[2] ?? '').padEnd(6, '0'))
    );
}

function wholeNumber(
    env: Io['env'],
    name: string,
    fallback: number,
    min: number,
    max: number,
): number {
    const text = env[name];

    if (text === undefined || text === '') {
        return fallback;
    }

    const value = /^\d{1,9}$/.test(text.trim()) ? Number(text.trim()) : NaN;

    if (!(value >= min && value <= max)) {
        throw new UsageError(
            `${name} must be a whole number from ${min} to ${max}.`,
        );
    }

    return value;
}

function dollars(env: Io['env'], name: string, fallback: string): number {
    const text = env[name];
    const micro = usdToMicro(
        text === undefined || text === '' ? fallback : text,
    );

    if (micro === undefined) {
        throw new UsageError(`${name} must be an amount like 1.50.`);
    }

    return micro;
}

function modelsFrom(env: Io['env']): string[] {
    const text = env['CB_MODELS'];
    const ids = (text === undefined || text === '' ? 'claude-opus-5-5' : text)
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');

    if (ids.length === 0 || new Set(ids).size !== ids.length) {
        throw new UsageError('CB_MODELS must list each model id once.');
    }

    for (const id of ids) {
        if (!modelIdSchema.safeParse(id).success || !hasPrice(id)) {
            throw new UsageError(
                `CB_MODELS: no price is known for "${id}", so a run on it could not be capped.`,
            );
        }
    }

    return ids;
}

/** What this month's earlier live runs cost, from the run files in `runs/`. */
export function monthSpent(runsDirectory: string, now: Date): number {
    if (!existsSync(runsDirectory)) {
        return 0;
    }

    const month = now.toISOString().slice(0, 7);
    let spent = 0;

    for (const entry of readdirSync(runsDirectory, { withFileTypes: true })) {
        const file = join(runsDirectory, entry.name, 'run.json');

        if (!entry.isDirectory() || !existsSync(file)) {
            continue;
        }

        // A run file that cannot be read stops the run: guessing low
        // here would let a month go over its cap.
        const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
        const run = parseRunFile(parsed);

        if (run.mode === 'live' && run.date.startsWith(month)) {
            spent += run.costMicroUsd;
        }
    }

    return spent;
}

function summary(run: RunFile): string[] {
    const lines = scoreCells(run).map((cell) => {
        const percent = breachPercent(cell);
        const rate =
            percent === undefined
                ? 'no attempts'
                : `${cell.breached} of ${cell.attempted} attempts breached (${percent}%)`;
        const errors = cell.errors > 0 ? `, ${cell.errors} failed calls` : '';

        return `  ${cell.target} / ${cell.defense} / ${cell.model}: ${rate}${errors}`;
    });

    return lines.length > 0 ? lines : ['  No attempts were made.'];
}

/** The `cb` command. Returns the exit code. */
export async function main(argv: readonly string[], io: Io): Promise<number> {
    const [command, ...rest] = argv;
    let out: string | undefined;

    if (command !== 'run') {
        io.print(USAGE);

        return command === '--help' || command === 'help'
            ? EXIT.done
            : EXIT.usage;
    }

    if (rest.length === 2 && rest[0] === '--out' && rest[1] !== undefined) {
        out = resolve(rest[1]);
    } else if (rest.length > 0) {
        io.print(USAGE);

        return EXIT.usage;
    }

    try {
        const asked = io.env['CB_MODE'] ?? 'demo';

        if (asked !== 'demo' && asked !== 'live') {
            throw new UsageError('CB_MODE must be demo or live.');
        }

        // Only whether a key is set is looked at here, never the key.
        const hasKey = (io.env['ANTHROPIC_API_KEY'] ?? '') !== '';
        const mode = asked === 'live' && hasKey ? 'live' : 'demo';

        if (asked === 'live' && !hasKey) {
            io.print(
                'CB_MODE=live needs ANTHROPIC_API_KEY. It is not set, so this is a demo run.',
            );
        }

        const models = modelsFrom(io.env);
        const attempts = wholeNumber(io.env, 'CB_ATTEMPTS', 3, 1, 10);
        const now = io.now();
        const recordings = fileStore(join(io.root, 'recordings'));
        const secrets = secretsIn(io.env);
        let client: ModelClient;
        let limits: Limits | undefined;

        if (mode === 'live') {
            limits = {
                tokenLimit: wholeNumber(
                    io.env,
                    'CB_TOKEN_LIMIT',
                    200_000,
                    1,
                    100_000_000,
                ),
                runCapMicroUsd: dollars(io.env, 'CB_RUN_CAP_USD', '1.00'),
                monthCapMicroUsd: dollars(io.env, 'CB_MONTH_CAP_USD', '10.00'),
                monthSpentMicroUsd: monthSpent(join(io.root, 'runs'), now),
            };
            client = recordingClient(io.liveClient(), recordings, secrets);
            io.print(
                `Live run: real models are called. Caps: ${formatUsd(limits.runCapMicroUsd)} for this run, ` +
                    `${formatUsd(limits.monthCapMicroUsd)} for the month (${formatUsd(limits.monthSpentMicroUsd)} spent so far), ` +
                    `${limits.tokenLimit} tokens.`,
            );
        } else {
            client = recordedClient(recordings);
        }

        const run = await runSuite({
            attacks: loadAttacks(join(io.root, 'attacks')),
            targets,
            defenses: [noDefense],
            models,
            attempts,
            mode,
            client,
            now,
            suiteVersion: suiteVersion(),
            price: costMicroUsd,
            ...(limits === undefined ? {} : { limits }),
            secrets,
        });

        const stamp = run.date.replace(/:/g, '');
        const file = join(
            out ??
                (mode === 'live'
                    ? join(io.root, 'runs', stamp)
                    : join(io.root, '.cb', 'demo-run')),
            'run.json',
        );

        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, formatRunFile(run), 'utf8');

        io.print(
            mode === 'live'
                ? 'Mode: live. Real models were called, and their replies were recorded.'
                : 'Mode: demo. Recorded replies were replayed; no model was called.',
        );
        io.print('Results:');
        summary(run).forEach(io.print);
        io.print(
            mode === 'live'
                ? `Cost: ${formatUsd(run.costMicroUsd)} (${run.tokens.input} tokens in, ${run.tokens.output} out).`
                : `Cost: nothing. (The recorded calls cost ${formatUsd(run.costMicroUsd)} when they were made.)`,
        );

        if (run.stopped !== undefined) {
            io.print(`Stopped early: ${run.stopped.detail}`);
        }

        io.print(`Run file: ${file}`);

        return run.stopped === undefined ? EXIT.done : EXIT.stoppedAtCap;
    } catch (error) {
        if (error instanceof UsageError) {
            io.print(error.message);

            return EXIT.usage;
        }

        if (error instanceof MissingRecordingError) {
            io.print(
                'There is no recording for this suite yet, or the attacks or sample apps changed since the last one. ' +
                    'Recordings are made by a live run (CB_MODE=live). Nothing was called and nothing was written.',
            );

            return EXIT.error;
        }

        if (error instanceof FormatError) {
            io.print(error.message);

            return EXIT.error;
        }

        throw error;
    }
}
