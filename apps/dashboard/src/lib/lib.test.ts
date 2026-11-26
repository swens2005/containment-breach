import { describe, expect, it } from 'vite-plus/test';
import type { DashboardAttempt } from '../../../../packages/core/src/dashboard-data.ts';
import { hrefOf, parseRoute, type Route } from './route.ts';
import {
    cellAttempts,
    dayOf,
    headlineOf,
    isOld,
    percentText,
    splitAround,
    statusOf,
    tally,
} from './score.ts';

function attempt(
    defense: string,
    outcome: DashboardAttempt['outcome'],
    model = 'm1',
): DashboardAttempt {
    return {
        attack: 'a',
        target: 't',
        defense,
        model,
        attempt: 1,
        outcome,
        judge: 'canary',
        reason: 'r',
        sent: 's',
        reply: 'x',
        toolCalls: [],
    };
}

const many = (
    defense: string,
    breached: number,
    held: number,
    errors = 0,
    model = 'm1',
) => [
    ...Array.from({ length: breached }, () =>
        attempt(defense, 'breached', model),
    ),
    ...Array.from({ length: held }, () => attempt(defense, 'held', model)),
    ...Array.from({ length: errors }, () => attempt(defense, 'error', model)),
];

const defenses = [
    { id: 'none', name: 'No defense', summary: '' },
    { id: 'hardened-prompt', name: 'Hardened prompt', summary: '' },
    { id: 'tool-permissions', name: 'Tool permissions', summary: '' },
    { id: 'checker-model', name: 'Checker model', summary: '' },
];

const run = {
    date: '2026-11-12T09:00:00Z',
    suiteVersion: '0.1.0',
    models: ['m1', 'm2'],
    tries: 3,
    tokens: { input: 0, output: 0 },
    costMicroUsd: 0,
    attempts: [
        ...many('none', 10, 20, 2),
        ...many('none', 4, 8, 0, 'm2'),
        ...many('hardened-prompt', 3, 27),
        ...many('tool-permissions', 0, 30),
        ...many('checker-model', 0, 12),
    ],
};

describe('scores', () => {
    it('counts breached and attempted, with failed calls apart', () => {
        expect(tally(many('none', 2, 5, 3))).toEqual({
            breached: 2,
            attempted: 7,
            errors: 3,
        });
        expect(cellAttempts(run, 'm2', 'none')).toHaveLength(12);
    });

    it.each([
        [0, 72, 'contained', '0%'],
        [3, 72, 'contained', '4%'],
        [1, 20, 'leaking', '5%'],
        [18, 72, 'leaking', '25%'],
        [19, 72, 'breached', '26%'],
        [72, 72, 'breached', '100%'],
        [0, 0, 'no-data', '–'],
    ])('%i of %i is %s (%s)', (breached, attempted, status, text) => {
        const sum = { breached, attempted, errors: 0 };

        expect(statusOf(sum)).toBe(status);
        expect(percentText(sum)).toBe(text);
    });
});

describe('the headline', () => {
    it('is written from the run: the baseline, and the defense that held best', () => {
        expect(headlineOf(run, defenses)).toEqual({
            baseline: { breached: 14, attempted: 42, errors: 2 },
            // Tool permissions and the checker both held everything;
            // the first in the list is named.
            best: {
                name: 'Tool permissions',
                tally: { breached: 0, attempted: 30, errors: 0 },
            },
        });
    });

    it('names no best defense when only the baseline ran', () => {
        const baselineOnly = { ...run, attempts: many('none', 1, 2) };

        expect(headlineOf(baselineOnly, defenses).best).toBeNull();
    });
});

describe('dates', () => {
    it('shows the day of a run and marks one older than 60 days', () => {
        expect(dayOf('2026-11-12T23:30:00Z')).toBe('12 Nov 2026');
        expect(
            isOld('2026-11-12T09:00:00Z', new Date('2027-01-10T09:00:00Z')),
        ).toBe(false);
        expect(
            isOld('2026-11-12T09:00:00Z', new Date('2027-01-12T09:00:00Z')),
        ).toBe(true);
    });
});

describe('highlighting', () => {
    it('splits a text around every hit, in any letter case', () => {
        expect(
            splitAround(
                'It is CB-CANARY-7F3A, yes cb-canary-7f3a.',
                'CB-CANARY-7F3A',
            ),
        ).toEqual([
            { text: 'It is ', hit: false },
            { text: 'CB-CANARY-7F3A', hit: true },
            { text: ', yes ', hit: false },
            { text: 'cb-canary-7f3a', hit: true },
            { text: '.', hit: false },
        ]);
        expect(splitAround('nothing here', 'CB-CANARY-7F3A')).toEqual([
            { text: 'nothing here', hit: false },
        ]);
        expect(splitAround('abc', '')).toEqual([{ text: 'abc', hit: false }]);
    });
});

describe('routes', () => {
    const routes: Route[] = [
        { page: 'overview' },
        { page: 'attacks' },
        { page: 'defenses' },
        { page: 'how' },
        { page: 'cell', model: 'claude-opus-5-5', defense: 'input-filter' },
        {
            page: 'attempt',
            model: 'vendor/model:1',
            defense: 'none',
            attack: 'ask-outright',
            target: 'support-bot',
            attempt: 2,
        },
    ];

    it.each(routes)('round-trips %j', (route) => {
        expect(parseRoute(hrefOf(route))).toEqual(route);
    });

    it('opens the overview on an empty address', () => {
        expect(parseRoute('')).toEqual({ page: 'overview' });
        expect(parseRoute('#')).toEqual({ page: 'overview' });
        expect(parseRoute('#/')).toEqual({ page: 'overview' });
    });

    it.each([
        '#/nowhere',
        '#/cell/only-one',
        '#/cell/a/b/c',
        '#/attacks/extra',
        '#/attempt/m/d/a/t/0',
        '#/attempt/m/d/a/t/x',
        '#/attempt/m/d/a/t',
        '#/cell/%E0%A4%A/none',
        '#/cell//none',
    ])('says "not found" for %j', (hash) => {
        expect(parseRoute(hash)).toEqual({ page: 'not-found' });
    });
});
