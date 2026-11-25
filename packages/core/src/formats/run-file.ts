import { z } from 'zod';
import { countSchema, idSchema, oneLine, parseAs } from './shared.ts';

/** The run-file format's own version. It changes when a field does. */
export const RUN_FILE_FORMAT = 1;

/** An exact model id as the vendor names it, never an alias like "latest". */
export const modelIdSchema = z
    .string()
    .regex(
        /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/,
        'Use the exact model id, without spaces.',
    )
    .max(100)
    .refine((id) => !/(?:^|[-:/._])latest$/.test(id), {
        message: 'Use the exact model id, not a "latest" alias.',
    });

/**
 * - `held`: the app kept its secret and its rules.
 * - `breached`: the judge found the canary or the forbidden tool call.
 * - `error`: the model call failed. Never counted as held.
 */
export const outcomeSchema = z.enum(['held', 'breached', 'error']);

export const resultSchema = z.strictObject({
    attack: idSchema,
    target: idSchema,
    defense: idSchema,
    model: modelIdSchema,
    /** Each attack is tried more than once, counted from 1. */
    attempt: z.int().min(1).max(100),
    outcome: outcomeSchema,
    /** Which judge decided, and why, in its own words. */
    judge: z.enum(['canary', 'forbidden-tool']),
    reason: oneLine(500),
});

export const runFileSchema = z
    .strictObject({
        format: z.literal(RUN_FILE_FORMAT),
        /** When the run started, in UTC, like `2026-11-25T14:00:00Z`. */
        date: z.iso.datetime({
            error: 'Use a UTC time like "2026-11-25T14:00:00Z".',
        }),
        /** The suite's version from package.json. */
        suiteVersion: z
            .string()
            .regex(/^\d+\.\d+\.\d+$/, 'Use a version like "1.2.3".'),
        /** `demo` replayed recorded replies; `live` called real models. */
        mode: z.enum(['demo', 'live']),
        models: z.array(modelIdSchema).min(1).max(20),
        tokens: z.strictObject({
            input: countSchema,
            output: countSchema,
        }),
        /**
         * Money is a whole number, never a fraction: millionths of a US
         * dollar, because one model call costs far less than a cent.
         */
        costMicroUsd: countSchema,
        results: z.array(resultSchema).max(100_000),
    })
    .superRefine((run, context) => {
        const models = new Set<string>();

        run.models.forEach((model, index) => {
            if (models.has(model)) {
                context.addIssue({
                    code: 'custom',
                    path: ['models', index],
                    message: `The model "${model}" is listed twice.`,
                });
            }

            models.add(model);
        });

        const attempts = new Set<string>();

        run.results.forEach((result, index) => {
            if (!models.has(result.model)) {
                context.addIssue({
                    code: 'custom',
                    path: ['results', index, 'model'],
                    message: `The model "${result.model}" is not in this run's models.`,
                });
            }

            const key = JSON.stringify([
                result.attack,
                result.target,
                result.defense,
                result.model,
                result.attempt,
            ]);

            if (attempts.has(key)) {
                context.addIssue({
                    code: 'custom',
                    path: ['results', index, 'attempt'],
                    message: 'This attempt is recorded twice.',
                });
            }

            attempts.add(key);
        });
    });

export type RunFile = z.infer<typeof runFileSchema>;
export type RunResult = z.infer<typeof resultSchema>;
export type Outcome = z.infer<typeof outcomeSchema>;

/** Check a run file's contents (already read from JSON). */
export function parseRunFile(input: unknown): RunFile {
    return parseAs(runFileSchema, 'run file', input);
}
