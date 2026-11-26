import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { loadAttacks } from '../core/src/attacks.ts';
import { parseRunFile } from '../core/src/formats/run-file.ts';
import { FormatError } from '../core/src/formats/shared.ts';
import type { ModelClient, ModelReply } from '../core/src/model/client.ts';
import { fits } from '../core/src/runner.ts';
import { targets } from '../targets/index.ts';
import { EXIT, type Io, main, monthSpent, usdToMicro } from './cb.ts';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const attackCount = readdirSync(join(repo, 'attacks')).length;

let root: string;
let printed: string[];
let liveCalls: number;

/** A stand-in for the live model: it never leaks, and counts its calls. */
function fakeLive(): ModelClient {
    return {
        complete(request): Promise<ModelReply> {
            liveCalls += 1;

            return Promise.resolve({
                model: request.model,
                text: 'Sorry, I cannot share staff information.',
                toolCalls: [],
                tokens: { input: 300, output: 40 },
                stop: 'end',
            });
        },
    };
}

function io(env: Io['env'] = {}): Io {
    return {
        env,
        root,
        now: () => new Date('2026-11-26T10:00:00Z'),
        print: (line) => printed.push(line),
        liveClient: fakeLive,
    };
}

const liveEnv = { CB_MODE: 'live', ANTHROPIC_API_KEY: 'not-a-real-key-1234' };

function readRun(path: string) {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));

    return parseRunFile(parsed);
}

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cb-cli-'));
    cpSync(join(repo, 'attacks'), join(root, 'attacks'), { recursive: true });
    printed = [];
    liveCalls = 0;
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('the attack files in this repo', () => {
    const attacks = loadAttacks(join(repo, 'attacks'));

    it('all load, and each fits at least one sample app', () => {
        expect(attacks.length).toBeGreaterThan(0);

        for (const attack of attacks) {
            expect(targets.some((target) => fits(attack, target))).toBe(true);
        }
    });

    it('never hold a canary themselves', () => {
        for (const attack of attacks) {
            expect(attack.payload).not.toMatch(/CB-CANARY/i);
        }
    });

    it('are refused when malformed or misnamed', () => {
        writeFileSync(join(root, 'attacks', 'broken.json'), '{ not json');
        expect(() => loadAttacks(join(root, 'attacks'))).toThrow(
            'broken.json is not valid JSON.',
        );

        writeFileSync(
            join(root, 'attacks', 'broken.json'),
            JSON.stringify({ ...attacks[0], id: 'another-name' }),
        );
        expect(() => loadAttacks(join(root, 'attacks'))).toThrow(
            'must be named after its id',
        );

        writeFileSync(
            join(root, 'attacks', 'broken.json'),
            JSON.stringify({ ...attacks[0], id: 'broken', owasp: 'LLM99' }),
        );
        expect(() => loadAttacks(join(root, 'attacks'))).toThrow(FormatError);
        expect(() => loadAttacks(join(root, 'attacks'))).toThrow(
            'broken.json: Not a valid attack',
        );
    });
});

describe('cb run', () => {
    it('explains itself on wrong usage', async () => {
        expect(await main([], io())).toBe(EXIT.usage);
        expect(await main(['launch'], io())).toBe(EXIT.usage);
        expect(await main(['run', '--fast'], io())).toBe(EXIT.usage);
        expect(await main(['help'], io())).toBe(EXIT.done);
        expect(printed.join('\n')).toContain('Usage: cb run');
    });

    it.each([
        [{ CB_MODE: 'turbo' }, 'CB_MODE must be demo or live.'],
        [{ CB_ATTEMPTS: '0' }, 'CB_ATTEMPTS must be a whole number'],
        [{ CB_ATTEMPTS: '2.5' }, 'CB_ATTEMPTS must be a whole number'],
        [{ CB_MODELS: 'gpt-latest' }, 'no price is known for "gpt-latest"'],
        [
            { CB_MODELS: 'claude-opus-5-5,claude-opus-5-5' },
            'each model id once',
        ],
        [
            { ...liveEnv, CB_RUN_CAP_USD: 'ten' },
            'CB_RUN_CAP_USD must be an amount',
        ],
        [
            { ...liveEnv, CB_MONTH_CAP_USD: '-1' },
            'CB_MONTH_CAP_USD must be an amount',
        ],
        [
            { ...liveEnv, CB_TOKEN_LIMIT: 'lots' },
            'CB_TOKEN_LIMIT must be a whole number',
        ],
    ])('refuses the settings %j', async (env, message) => {
        expect(await main(['run'], io(env))).toBe(EXIT.usage);
        expect(printed.join('\n')).toContain(message);
        expect(liveCalls).toBe(0);
    });

    it('is a demo by default, and fails loudly without recordings', async () => {
        expect(await main(['run'], io())).toBe(EXIT.error);
        expect(printed.join('\n')).toContain('There is no recording');
        expect(liveCalls).toBe(0);
        expect(existsSync(join(root, '.cb'))).toBe(false);
    });

    it('stays a demo without a key, whatever CB_MODE says, and says so', async () => {
        expect(await main(['run'], io({ CB_MODE: 'live' }))).toBe(EXIT.error);
        expect(printed[0]).toContain(
            'CB_MODE=live needs ANTHROPIC_API_KEY. It is not set, so this is a demo run.',
        );
        expect(liveCalls).toBe(0);

        printed = [];
        expect(
            await main(['run'], io({ CB_MODE: 'live', ANTHROPIC_API_KEY: '' })),
        ).toBe(EXIT.error);
        expect(liveCalls).toBe(0);
    });

    it('runs live with a key, records, and then replays as a demo for free', async () => {
        expect(await main(['run'], io(liveEnv))).toBe(EXIT.done);

        const calls = attackCount * 3;
        const liveFile = join(root, 'runs', '2026-11-26T100000Z', 'run.json');
        const live = readRun(liveFile);

        expect(liveCalls).toBe(calls);
        expect(live.mode).toBe('live');
        expect(live.results).toHaveLength(calls);
        expect(live.tokens).toEqual({ input: 300 * calls, output: 40 * calls });
        expect(live.costMicroUsd).toBe((300 * 4 + 40 * 20) * calls);
        expect(readdirSync(join(root, 'recordings'))).toHaveLength(calls);
        expect(printed.join('\n')).toContain('Mode: live.');
        expect(printed.join('\n')).toContain(
            `0 of ${calls} attempts breached (0%)`,
        );
        expect(printed.at(-1)).toBe(`Run file: ${liveFile}`);

        // No file on disk holds the key.
        for (const name of readdirSync(join(root, 'recordings'))) {
            expect(
                readFileSync(join(root, 'recordings', name), 'utf8'),
            ).not.toContain('not-a-real-key');
        }

        printed = [];
        liveCalls = 0;
        expect(await main(['run'], io())).toBe(EXIT.done);

        const demo = readRun(join(root, '.cb', 'demo-run', 'run.json'));

        expect(liveCalls).toBe(0);
        expect(demo.mode).toBe('demo');
        expect(demo.results).toEqual(live.results);
        expect(printed.join('\n')).toContain('no model was called');
        expect(printed.join('\n')).toContain('Cost: nothing.');
    });

    it('writes where --out says', async () => {
        const out = join(root, 'elsewhere');

        expect(await main(['run', '--out', out], io(liveEnv))).toBe(EXIT.done);
        expect(readRun(join(out, 'run.json')).mode).toBe('live');
        expect(existsSync(join(root, 'runs'))).toBe(false);
    });

    it('stops halfway at the spending cap, and marks the run file as stopped', async () => {
        // One call costs 2,000 and is estimated at about 41,000 before
        // it is made, so a cap of 0.05 dollars allows a few calls only.
        const code = await main(
            ['run'],
            io({ ...liveEnv, CB_RUN_CAP_USD: '0.05' }),
        );
        const run = readRun(
            join(root, 'runs', '2026-11-26T100000Z', 'run.json'),
        );

        expect(code).toBe(EXIT.stoppedAtCap);
        expect(run.stopped?.reason).toBe('run-cap');
        expect(run.results.length).toBeGreaterThan(0);
        expect(run.results.length).toBeLessThan(attackCount * 3);
        expect(liveCalls).toBe(run.results.length);
        expect(run.costMicroUsd).toBeLessThanOrEqual(50_000);
        expect(printed.join('\n')).toContain('Stopped early:');
    });

    it('counts earlier live runs of the month against the monthly cap', async () => {
        const earlier = (folder: string, date: string, mode: string) => {
            mkdirSync(join(root, 'runs', folder), { recursive: true });
            writeFileSync(
                join(root, 'runs', folder, 'run.json'),
                JSON.stringify({
                    format: 1,
                    date,
                    suiteVersion: '0.1.0',
                    mode,
                    models: ['claude-opus-5-5'],
                    tokens: { input: 0, output: 0 },
                    costMicroUsd: 4_000_000,
                    results: [],
                }),
            );
        };

        earlier('a', '2026-11-02T08:00:00Z', 'live');
        earlier('b', '2026-11-20T08:00:00Z', 'live');
        earlier('c', '2026-10-30T08:00:00Z', 'live');
        earlier('d', '2026-11-21T08:00:00Z', 'demo');

        expect(
            monthSpent(join(root, 'runs'), new Date('2026-11-26T10:00:00Z')),
        ).toBe(8_000_000);
        expect(monthSpent(join(root, 'nowhere'), new Date())).toBe(0);

        const code = await main(
            ['run'],
            io({ ...liveEnv, CB_MONTH_CAP_USD: '8.01' }),
        );

        expect(code).toBe(EXIT.stoppedAtCap);
        expect(liveCalls).toBe(0);
        expect(printed.join('\n')).toContain("this month's spending cap");
    });

    it('refuses to run when an earlier run file cannot be trusted', async () => {
        mkdirSync(join(root, 'runs', 'bad'), { recursive: true });
        writeFileSync(join(root, 'runs', 'bad', 'run.json'), '{"format": 9}');

        expect(await main(['run'], io(liveEnv))).toBe(EXIT.error);
        expect(printed.join('\n')).toContain('Not a valid run file');
        expect(liveCalls).toBe(0);
    });
});

describe('amounts', () => {
    it('reads dollars as whole millionths', () => {
        expect(usdToMicro('1')).toBe(1_000_000);
        expect(usdToMicro('1.50')).toBe(1_500_000);
        expect(usdToMicro('0.000001')).toBe(1);
        expect(usdToMicro(' 10.00 ')).toBe(10_000_000);
        expect(usdToMicro('0.1')).toBe(100_000);

        for (const bad of ['', 'ten', '-1', '1.', '.5', '1.0000001', '1e3']) {
            expect(usdToMicro(bad)).toBeUndefined();
        }
    });
});
