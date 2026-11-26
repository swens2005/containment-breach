import type { Defense } from './defense.ts';
import { type Attack, OWASP_LLM_2025 } from './formats/attack.ts';
import type { RunFile } from './formats/run-file.ts';
import type { ModelClient, ToolCall } from './model/client.ts';
import { type AttemptTrace, formatRunFile, runSuite } from './runner.ts';
import type { TargetApp } from './target-app.ts';

/** One attempt as the dashboard shows it, transcript included. */
export interface DashboardAttempt {
    attack: string;
    target: string;
    defense: string;
    model: string;
    attempt: number;
    outcome: 'held' | 'breached' | 'error';
    judge: 'canary' | 'forbidden-tool';
    reason: string;
    /** What the app sent to the model: its last user message. */
    sent: string;
    /** What the app answered, after the defense. Empty when the call failed. */
    reply: string;
    toolCalls: ToolCall[];
}

/** Everything the static dashboard shows. Written at build time. */
export interface DashboardData {
    /** True for made-up data used while building the site locally. */
    sample: boolean;
    run: {
        date: string;
        suiteVersion: string;
        models: string[];
        tries: number;
        tokens: { input: number; output: number };
        costMicroUsd: number;
        attempts: DashboardAttempt[];
    } | null;
    attacks: (Attack & { owaspName: string })[];
    targets: {
        id: string;
        summary: string;
        canary: string;
        tools: { name: string; rule: string }[];
    }[];
    defenses: { id: string; name: string; summary: string }[];
}

/** The newest live run that finished, or `null` when there is none. */
export function latestFinishedRun(runs: readonly RunFile[]): RunFile | null {
    const finished = runs
        .filter((run) => run.mode === 'live' && run.stopped === undefined)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return finished[0] ?? null;
}

/**
 * Whether the site is built with sample data: when asked for outright
 * (local work), or when a demo is allowed and there is no finished
 * live run to show. A real run always wins over the demo.
 */
export function wantsSample(input: {
    asked: boolean;
    demoAllowed: boolean;
    finishedRun: RunFile | null;
}): boolean {
    return input.asked || (input.demoAllowed && input.finishedRun === null);
}

/**
 * Build the dashboard's data by replaying a run from its recordings.
 * The replay must give exactly the run file that was written by the
 * live run: the page can then never show a number, or a reply, that
 * the recordings do not back.
 */
export async function buildDashboardData(input: {
    run: RunFile | null;
    /** A client that replays the run's recordings. */
    client: ModelClient;
    attacks: readonly Attack[];
    targets: readonly TargetApp[];
    defenses: readonly Defense[];
    price: (model: string, tokens: { input: number; output: number }) => number;
    sample?: boolean;
}): Promise<DashboardData> {
    const { run } = input;
    const data: DashboardData = {
        sample: input.sample ?? false,
        run: null,
        attacks: input.attacks.map((attack) => ({
            ...attack,
            owaspName: OWASP_LLM_2025[attack.owasp],
        })),
        targets: input.targets.map(({ declaration }) => ({
            id: declaration.id,
            summary: declaration.summary,
            canary: declaration.canary,
            tools: declaration.forbiddenTools,
        })),
        defenses: input.defenses.map(({ id, name, summary }) => ({
            id,
            name,
            summary,
        })),
    };

    if (run === null) {
        return data;
    }

    if (run.mode !== 'live' || run.stopped !== undefined) {
        throw new Error('The dashboard only shows live runs that finished.');
    }

    const traces: AttemptTrace[] = [];
    const tries = Math.max(1, ...run.results.map((result) => result.attempt));
    const replayed = await runSuite({
        attacks: input.attacks,
        targets: input.targets,
        defenses: input.defenses,
        models: run.models,
        attempts: tries,
        mode: 'live',
        client: input.client,
        now: new Date(run.date),
        suiteVersion: run.suiteVersion,
        price: input.price,
        onAttempt: (trace) => traces.push(trace),
    });

    if (formatRunFile(replayed) !== formatRunFile(run)) {
        throw new Error(
            `The recordings do not reproduce the run of ${run.date}. ` +
                'The attacks, the sample apps or the recordings changed since that run. ' +
                'The dashboard is not built from data it cannot check.',
        );
    }

    data.run = {
        date: run.date,
        suiteVersion: run.suiteVersion,
        models: run.models,
        tries,
        tokens: run.tokens,
        costMicroUsd: run.costMicroUsd,
        attempts: traces.map(({ result, request, reply }) => ({
            ...result,
            sent: request.messages.at(-1)?.content ?? '',
            reply: reply?.text ?? '',
            toolCalls: reply?.toolCalls ?? [],
        })),
    };

    return data;
}
