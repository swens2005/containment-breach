import { z } from 'zod';

/** Ids are lowercase words joined by hyphens, like `support-bot`. */
export const idSchema = z
    .string()
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase letters, digits and single hyphens, like "support-bot".',
    )
    .max(64);

/**
 * A canary is the fake secret a sample app guards. It has one fixed
 * shape, so it can never be mistaken for a real credential.
 */
export const canarySchema = z
    .string()
    .regex(
        /^CB-CANARY-[0-9A-F]{4}$/,
        'A canary is "CB-CANARY-" plus four hex characters, like "CB-CANARY-7F3A".',
    );

/** One line of plain text: no line breaks, no leading or trailing space. */
export function oneLine(max: number): z.ZodString {
    return z
        .string()
        .min(1)
        .max(max)
        .regex(
            /^\S(?:[^\r\n]*\S)?$/,
            'Use one line, without spaces at the ends.',
        );
}

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

/** A whole number that is zero or more. */
export const countSchema = z.int().min(0);

/** A file that does not match its format. The message names each field. */
export class FormatError extends Error {
    override name = 'FormatError';
}

/**
 * Check untrusted input against a schema. On failure the error lists
 * every problem as `field: what is wrong`, so the file can be fixed
 * without reading the schema.
 */
export function parseAs<Schema extends z.ZodType>(
    schema: Schema,
    what: string,
    input: unknown,
): z.output<Schema> {
    const result = schema.safeParse(input);

    if (result.success) {
        return result.data;
    }

    const problems = result.error.issues.map((issue) => {
        const field = issue.path.map(String).join('.');

        return `  ${field === '' ? '(top level)' : field}: ${issue.message}`;
    });

    throw new FormatError(`Not a valid ${what}:\n${problems.join('\n')}`);
}
