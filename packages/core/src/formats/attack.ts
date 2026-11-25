import { z } from 'zod';
import { idSchema, oneLine, parseAs } from './shared.ts';

/**
 * The categories of the OWASP Top 10 for LLM Applications, 2025
 * edition. An attack file names one by its number.
 */
export const OWASP_LLM_2025 = {
    LLM01: 'Prompt Injection',
    LLM02: 'Sensitive Information Disclosure',
    LLM03: 'Supply Chain',
    LLM04: 'Data and Model Poisoning',
    LLM05: 'Improper Output Handling',
    LLM06: 'Excessive Agency',
    LLM07: 'System Prompt Leakage',
    LLM08: 'Vector and Embedding Weaknesses',
    LLM09: 'Misinformation',
    LLM10: 'Unbounded Consumption',
} as const;

export const owaspSchema = z.enum([
    'LLM01',
    'LLM02',
    'LLM03',
    'LLM04',
    'LLM05',
    'LLM06',
    'LLM07',
    'LLM08',
    'LLM09',
    'LLM10',
]);

/** A MITRE ATLAS technique id, like `AML.T0051` or `AML.T0051.000`. */
export const atlasSchema = z
    .string()
    .regex(
        /^AML\.T\d{4}(?:\.\d{3})?$/,
        'A MITRE ATLAS technique id looks like "AML.T0051" or "AML.T0051.000".',
    );

/**
 * Where the payload goes. `typed` is direct injection: the attacker is
 * the one talking to the app. The others are indirect injection: the
 * payload hides in content the app reads for an innocent user.
 */
export const deliverySchema = z.enum([
    'typed',
    'email',
    'document',
    'web-page',
]);

/**
 * How an attempt is judged. Both judges are plain code.
 * - `canary`: breached when the target's canary shows up in the reply.
 * - `forbidden-tool`: breached when the target calls the named tool.
 */
export const judgeSchema = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('canary') }),
    z.strictObject({ kind: z.literal('forbidden-tool'), tool: idSchema }),
]);

export const attackSchema = z.strictObject({
    id: idSchema,
    title: oneLine(120),
    owasp: owaspSchema,
    atlas: atlasSchema,
    /** Where the technique was described. Always an https link. */
    source: z
        .url({ protocol: /^https$/, error: 'Use an https link.' })
        .max(500),
    delivery: deliverySchema,
    payload: z.string().min(1).max(8000),
    judge: judgeSchema,
});

export type Attack = z.infer<typeof attackSchema>;
export type Delivery = z.infer<typeof deliverySchema>;
export type Judge = z.infer<typeof judgeSchema>;
export type OwaspCategory = z.infer<typeof owaspSchema>;

/** Check an attack file's contents (already read from JSON). */
export function parseAttack(input: unknown): Attack {
    return parseAs(attackSchema, 'attack', input);
}
