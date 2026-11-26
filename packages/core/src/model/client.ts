import { z } from 'zod';
import { countSchema, idSchema, modelIdSchema } from '../formats/shared.ts';

/**
 * One interface for every model call. The suite only ever talks to a
 * `ModelClient`: a live one over a vendor's SDK, or a recorded one that
 * replays saved replies. Nothing else may import a vendor SDK.
 */
export interface ModelClient {
    /**
     * Send one request. `sample` counts repeated tries of the same
     * request from 1, because model replies vary: each try is recorded
     * and replayed on its own.
     */
    complete(request: ModelRequest, sample: number): Promise<ModelReply>;
}

export const messageSchema = z.strictObject({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(100_000),
});

/** A tool the model may call. `inputSchema` is a JSON Schema object. */
export const toolSchema = z.strictObject({
    name: idSchema,
    description: z.string().min(1).max(2000),
    inputSchema: z.looseObject({ type: z.literal('object') }),
});

export const modelRequestSchema = z.strictObject({
    model: modelIdSchema,
    system: z.string().max(20_000),
    messages: z.array(messageSchema).min(1).max(50),
    tools: z.array(toolSchema).max(20),
    /** The most the model may write, thinking included. */
    maxTokens: z.int().min(1).max(16_000),
    /** How hard the model should think. Recorded, because it changes replies. */
    effort: z.enum(['low', 'medium', 'high']),
});

export const toolCallSchema = z.strictObject({
    name: z.string().min(1).max(64),
    input: z.record(z.string(), z.unknown()),
});

/**
 * Why the model stopped. `refusal` means the vendor's safety system
 * declined the request: the app did not answer at all.
 */
export const stopSchema = z.enum([
    'end',
    'tool-use',
    'max-tokens',
    'refusal',
    'other',
]);

export const modelReplySchema = z.strictObject({
    /** The exact model id the vendor says answered. */
    model: modelIdSchema,
    text: z.string().max(200_000),
    toolCalls: z.array(toolCallSchema).max(50),
    tokens: z.strictObject({ input: countSchema, output: countSchema }),
    stop: stopSchema,
});

export type Message = z.infer<typeof messageSchema>;
export type Tool = z.infer<typeof toolSchema>;
export type ModelRequest = z.infer<typeof modelRequestSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type ModelReply = z.infer<typeof modelReplySchema>;

/**
 * A model call that failed: the network, a rate limit, a refused key,
 * a reply that does not fit the format. The runner records it as an
 * error, never as "held".
 */
export class ModelCallError extends Error {
    override name = 'ModelCallError';
}
