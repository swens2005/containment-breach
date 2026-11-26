import type { ModelClient, ModelRequest } from './model/client.ts';

/** The limits of one run. Every limit is a whole number. */
export interface Limits {
    /** The most tokens one run may use, input and output together. */
    tokenLimit: number;
    /** The most one run may cost, in millionths of a US dollar. */
    runCapMicroUsd: number;
    /** The most all live runs of this month may cost, this run included. */
    monthCapMicroUsd: number;
    /** What this month's earlier live runs cost. */
    monthSpentMicroUsd: number;
}

export type StopReason = 'token-limit' | 'run-cap' | 'month-cap';

/** Thrown before a call that would pass a limit. The call is not made. */
export class LimitReached extends Error {
    override name = 'LimitReached';
    readonly reason: StopReason;

    constructor(reason: StopReason, detail: string) {
        super(detail);
        this.reason = reason;
    }
}

/**
 * A guess, on the high side, of what a request will use: about one
 * token for every two characters sent, and the full `maxTokens` back.
 */
export function estimateTokens(request: ModelRequest): {
    input: number;
    output: number;
} {
    const sent =
        request.system.length +
        request.messages.reduce((sum, m) => sum + m.content.length, 0) +
        (request.tools.length > 0 ? JSON.stringify(request.tools).length : 0);

    return { input: Math.ceil(sent / 2), output: request.maxTokens };
}

/** A model client that counts what passes through it. */
export interface Meter extends ModelClient {
    tokens(): { input: number; output: number };
    costMicroUsd(): number;
    /** Every exact model id that answered. */
    models(): string[];
}

/**
 * Counts tokens and cost of every call, and, when limits are given,
 * refuses a call whose estimated cost would pass one of them.
 */
export function meter(
    client: ModelClient,
    price: (model: string, tokens: { input: number; output: number }) => number,
    limits?: Limits,
): Meter {
    const used = { input: 0, output: 0 };
    const answered = new Set<string>();
    let spent = 0;

    return {
        async complete(request, sample) {
            if (limits !== undefined) {
                const guess = estimateTokens(request);
                const next = price(request.model, guess);

                if (
                    used.input + used.output + guess.input + guess.output >
                    limits.tokenLimit
                ) {
                    throw new LimitReached(
                        'token-limit',
                        `The next call could pass the run's limit of ${limits.tokenLimit} tokens.`,
                    );
                }

                if (spent + next > limits.runCapMicroUsd) {
                    throw new LimitReached(
                        'run-cap',
                        "The next call could pass the run's spending cap.",
                    );
                }

                if (
                    limits.monthSpentMicroUsd + spent + next >
                    limits.monthCapMicroUsd
                ) {
                    throw new LimitReached(
                        'month-cap',
                        "The next call could pass this month's spending cap.",
                    );
                }
            }

            const reply = await client.complete(request, sample);

            used.input += reply.tokens.input;
            used.output += reply.tokens.output;
            spent += price(reply.model, reply.tokens);
            answered.add(reply.model);

            return reply;
        },
        tokens: () => ({ ...used }),
        costMicroUsd: () => spent,
        models: () => [...answered],
    };
}
