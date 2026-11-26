import type { Defense } from './defense.ts';
import type { Attack } from './formats/attack.ts';
import {
    parseRunFile,
    RUN_FILE_FORMAT,
    type RunFile,
    type RunResult,
} from './formats/run-file.ts';
import { judge } from './judge.ts';
import { LimitReached, type Limits, meter } from './meter.ts';
import { ModelCallError, type ModelClient } from './model/client.ts';
import { scrubText } from './scrub.ts';
import type { TargetApp } from './target-app.ts';

/** Everything one run needs. Nothing is read from the outside world. */
export interface RunPlan {
    attacks: readonly Attack[];
    targets: readonly TargetApp[];
    defenses: readonly Defense[];
    /** Exact model ids. */
    models: readonly string[];
    /** How often each attack is tried. Model replies vary. */
    attempts: number;
    mode: 'demo' | 'live';
    client: ModelClient;
    /** When the run starts. */
    now: Date;
    suiteVersion: string;
    /** What tokens cost on a model, in millionths of a US dollar. */
    price: (model: string, tokens: { input: number; output: number }) => number;
    /** A live run always has limits. */
    limits?: Limits;
    /** Known secrets to scrub from anything written down. */
    secrets?: readonly string[];
}

/** Whether an attack can be tried against a sample app at all. */
export function fits(attack: Attack, target: TargetApp): boolean {
    if (!target.deliveries.includes(attack.delivery)) {
        return false;
    }

    if (attack.judge.kind === 'forbidden-tool') {
        const tool = attack.judge.tool;

        return target.declaration.forbiddenTools.some((t) => t.name === tool);
    }

    return true;
}

/** One clean line of at most 500 characters, without anything secret. */
function line(text: string, secrets: readonly string[]): string {
    return scrubText(text, secrets).replace(/\s+/g, ' ').trim().slice(0, 500);
}

/**
 * Try every attack against every sample app it fits, under each
 * defense and on each model, `attempts` times, and write down what
 * happened as a run file.
 *
 * A failed model call is recorded as an error. A missing recording, or
 * any other bug, stops the run with that error: a run file is never
 * written from a half-understood run.
 */
export async function runSuite(plan: RunPlan): Promise<RunFile> {
    const secrets = plan.secrets ?? [];
    const metered = meter(plan.client, plan.price, plan.limits);
    const results: RunResult[] = [];
    let stopped: RunFile['stopped'];

    try {
        for (const target of plan.targets) {
            for (const defense of plan.defenses) {
                const guarded = defense.wrap(metered, target.declaration);

                for (const model of plan.models) {
                    for (const attack of plan.attacks) {
                        if (!fits(attack, target)) {
                            continue;
                        }

                        for (let n = 1; n <= plan.attempts; n += 1) {
                            const attempt = {
                                attack: attack.id,
                                target: target.declaration.id,
                                defense: defense.id,
                                model,
                                attempt: n,
                            };

                            try {
                                const reply = await guarded.complete(
                                    target.request({
                                        model,
                                        delivery: attack.delivery,
                                        payload: attack.payload,
                                    }),
                                    n,
                                );
                                const verdict = judge(
                                    attack.judge,
                                    target.declaration,
                                    reply,
                                );

                                results.push({
                                    ...attempt,
                                    outcome: verdict.outcome,
                                    judge: attack.judge.kind,
                                    reason: line(verdict.reason, secrets),
                                });
                            } catch (error) {
                                if (!(error instanceof ModelCallError)) {
                                    throw error;
                                }

                                results.push({
                                    ...attempt,
                                    outcome: 'error',
                                    judge: attack.judge.kind,
                                    reason: line(
                                        `The model call failed: ${error.message}`,
                                        secrets,
                                    ),
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        if (!(error instanceof LimitReached)) {
            throw error;
        }

        stopped = {
            reason: error.reason,
            detail: line(error.message, secrets),
        };
    }

    return parseRunFile({
        format: RUN_FILE_FORMAT,
        date: plan.now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        suiteVersion: plan.suiteVersion,
        mode: plan.mode,
        models: [...plan.models],
        tokens: metered.tokens(),
        costMicroUsd: metered.costMicroUsd(),
        ...(stopped === undefined ? {} : { stopped }),
        results,
    });
}

/** A run file as text: the same run always gives the same bytes. */
export function formatRunFile(run: RunFile): string {
    return `${JSON.stringify(run, null, 4)}\n`;
}
