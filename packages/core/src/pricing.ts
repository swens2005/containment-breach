/**
 * List prices, in millionths of a US dollar per million tokens (so
 * 4_000_000 means $4.00 per million tokens). Checked on 3 November
 * 2026 against the vendor's price list; check again before a live run.
 */
const PRICES: Readonly<Record<string, { input: number; output: number }>> = {
    'claude-opus-5-5': { input: 4_000_000, output: 20_000_000 },
    'claude-sonnet-5-5': { input: 2_000_000, output: 10_000_000 },
    // For prompts up to 100,000 tokens; the suite's are far shorter.
    'claude-haiku-5-5': { input: 100_000, output: 500_000 },
};

/** Whether the suite knows what this model costs. */
export function hasPrice(model: string): boolean {
    return Object.hasOwn(PRICES, model);
}

/**
 * What a number of tokens costs on a model, in whole millionths of a
 * US dollar, rounded up. A model without a known price cannot be
 * capped, so asking for its cost is an error.
 */
export function costMicroUsd(
    model: string,
    tokens: { input: number; output: number },
): number {
    const price = PRICES[model];

    if (price === undefined || !hasPrice(model)) {
        throw new Error(`No price is known for the model "${model}".`);
    }

    return Math.ceil(
        (tokens.input * price.input + tokens.output * price.output) / 1_000_000,
    );
}

/** A cost for people to read, like "$0.0421". Display only. */
export function formatUsd(microUsd: number): string {
    return `$${(microUsd / 1_000_000).toFixed(4)}`;
}
