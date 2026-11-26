import Anthropic from '@anthropic-ai/sdk';
import { FormatError, parseAs } from '../formats/shared.ts';
import {
    ModelCallError,
    type ModelClient,
    type ModelReply,
    type ModelRequest,
    modelReplySchema,
    modelRequestSchema,
} from './client.ts';

/** The one SDK call this client makes. Tests pass a stand-in. */
export type CreateMessage = (
    body: Anthropic.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Message>;

/**
 * The SDK finds the API key in the environment by itself
 * (`ANTHROPIC_API_KEY`). This code never reads, logs or stores it.
 */
function sdkCreate(): CreateMessage {
    let client: Anthropic | undefined;

    return (body) => {
        client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });

        return client.messages.create(body);
    };
}

function toBody(
    request: ModelRequest,
): Anthropic.MessageCreateParamsNonStreaming {
    return {
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: request.messages,
        output_config: { effort: request.effort },
        // No `fallbacks` on purpose: a fallback would answer with another
        // model, and a result must belong to the model it names. A
        // refusal is recorded as a refusal.
        ...(request.tools.length > 0
            ? {
                  tools: request.tools.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                      input_schema: tool.inputSchema,
                  })),
              }
            : {}),
    };
}

function toStop(reason: Anthropic.Message['stop_reason']): ModelReply['stop'] {
    switch (reason) {
        case 'end_turn':
        case 'stop_sequence':
            return 'end';
        case 'tool_use':
            return 'tool-use';
        case 'max_tokens':
            return 'max-tokens';
        case 'refusal':
            return 'refusal';
        default:
            return 'other';
    }
}

function toReply(message: Anthropic.Message): unknown {
    const text: string[] = [];
    const toolCalls: { name: string; input: unknown }[] = [];

    for (const block of message.content) {
        if (block.type === 'text') {
            text.push(block.text);
        } else if (block.type === 'tool_use') {
            toolCalls.push({ name: block.name, input: block.input });
        }
        // Thinking blocks are not part of what the app shows anyone.
    }

    return {
        model: message.model,
        text: text.join(''),
        toolCalls,
        tokens: {
            input:
                message.usage.input_tokens +
                (message.usage.cache_creation_input_tokens ?? 0) +
                (message.usage.cache_read_input_tokens ?? 0),
            output: message.usage.output_tokens,
        },
        stop: toStop(message.stop_reason),
    };
}

/** Says what went wrong without repeating anything the server sent back. */
function describe(error: InstanceType<typeof Anthropic.APIError>): string {
    if (error instanceof Anthropic.AuthenticationError) {
        return 'The API key was refused.';
    }

    if (error instanceof Anthropic.PermissionDeniedError) {
        return 'This API key may not use that model.';
    }

    if (error instanceof Anthropic.NotFoundError) {
        return 'The model was not found.';
    }

    if (error instanceof Anthropic.RateLimitError) {
        return 'Rate limited.';
    }

    if (error instanceof Anthropic.BadRequestError) {
        return 'The request was refused as invalid.';
    }

    if (error instanceof Anthropic.APIConnectionError) {
        return 'Could not reach the API.';
    }

    return `The API answered with status ${String(error.status)}.`;
}

/** A live client for Claude models, over Anthropic's official SDK. */
export function anthropicClient(
    create: CreateMessage = sdkCreate(),
): ModelClient {
    return {
        async complete(request) {
            const asked = parseAs(modelRequestSchema, 'model request', request);
            let message: Anthropic.Message;

            try {
                message = await create(toBody(asked));
            } catch (error) {
                if (error instanceof Anthropic.APIError) {
                    throw new ModelCallError(describe(error), { cause: error });
                }

                throw error;
            }

            try {
                return parseAs(
                    modelReplySchema,
                    'model reply',
                    toReply(message),
                );
            } catch (error) {
                if (error instanceof FormatError) {
                    throw new ModelCallError(error.message, { cause: error });
                }

                throw error;
            }
        },
    };
}
