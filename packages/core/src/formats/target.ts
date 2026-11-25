import { z } from 'zod';
import { canarySchema, idSchema, oneLine, parseAs } from './shared.ts';

/** A tool the sample app has, and the rule it must keep when using it. */
export const forbiddenToolSchema = z.strictObject({
    name: idSchema,
    /** What counts as misuse, in one sentence. */
    rule: oneLine(200),
});

export const targetSchema = z
    .strictObject({
        id: idSchema,
        /** What the sample app does, in one sentence. */
        summary: oneLine(200),
        /** The fake secret it guards. */
        canary: canarySchema,
        /** Tools it must not misuse. Empty for an app without tools. */
        forbiddenTools: z.array(forbiddenToolSchema).max(20),
    })
    .superRefine((target, context) => {
        const seen = new Set<string>();

        target.forbiddenTools.forEach((tool, index) => {
            if (seen.has(tool.name)) {
                context.addIssue({
                    code: 'custom',
                    path: ['forbiddenTools', index, 'name'],
                    message: `The tool "${tool.name}" is listed twice.`,
                });
            }

            seen.add(tool.name);
        });
    });

export type Target = z.infer<typeof targetSchema>;
export type ForbiddenTool = z.infer<typeof forbiddenToolSchema>;

/** Check a target's declaration. */
export function parseTarget(input: unknown): Target {
    return parseAs(targetSchema, 'target', input);
}
