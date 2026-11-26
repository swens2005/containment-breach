/** What a scrubbed secret is replaced with. */
export const SCRUBBED = '[scrubbed]';

/**
 * Shapes of real credentials. Canaries (`CB-CANARY-7F3A`) match none
 * of them on purpose, so a leaked canary stays readable.
 */
const SECRET_SHAPES: readonly RegExp[] = [
    /\bsk-[A-Za-z0-9_-]{16,}/g,
    /\bAIza[0-9A-Za-z_-]{30,}/g,
    /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
    /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/g,
];

/**
 * Remove anything that looks like a real key from a text, plus the
 * exact secrets the caller knows about (the keys in its environment).
 */
export function scrubText(
    text: string,
    secrets: readonly string[] = [],
): string {
    let clean = text;

    for (const secret of secrets) {
        // A very short "secret" would blank out ordinary words.
        if (secret.length >= 8) {
            clean = clean.split(secret).join(SCRUBBED);
        }
    }

    for (const shape of SECRET_SHAPES) {
        clean = clean.replace(shape, SCRUBBED);
    }

    return clean;
}

/** Scrub every string inside a JSON value, keys included. */
export function scrubDeep<Value>(
    value: Value,
    secrets: readonly string[] = [],
): Value {
    const walk = (node: unknown): unknown => {
        if (typeof node === 'string') {
            return scrubText(node, secrets);
        }

        if (Array.isArray(node)) {
            return node.map(walk);
        }

        if (typeof node === 'object' && node !== null) {
            return Object.fromEntries(
                Object.entries(node).map(([key, child]) => [
                    scrubText(key, secrets),
                    walk(child),
                ]),
            );
        }

        return node;
    };

    return walk(value) as Value;
}

/** The API keys present in an environment, for `scrubText`. */
export function secretsIn(
    environment: Readonly<Record<string, string | undefined>>,
): string[] {
    return Object.entries(environment)
        .filter(([name]) => /KEY|TOKEN|SECRET|PASSWORD/i.test(name))
        .map(([, value]) => value)
        .filter((value): value is string => typeof value === 'string');
}
