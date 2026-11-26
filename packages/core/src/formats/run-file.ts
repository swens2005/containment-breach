import { z } from 'zod';
import {
    countSchema,
    idSchema,
    modelIdSchema,
    oneLine,
    parseAs,
} from './shared.ts';

export { modelIdSchema };

/** The run-file format's own version. It changes when a field does. */
export const RUN_FILE_FORMAT = 1;

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
        /** Present only when the run stopped early at one of its limits. */
        stopped: z
            .strictObject({
                reason: z.enum(['token-limit', 'run-cap', 'month-cap']),
                detail: oneLine(300),
            })
            .optional(),
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
