import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { parseAs } from '../formats/shared.ts';
import { scrubDeep } from '../scrub.ts';
import {
    type ModelClient,
    type ModelReply,
    type ModelRequest,
    modelReplySchema,
    modelRequestSchema,
} from './client.ts';

/** One saved model call: what was asked, which try it was, what came back. */
export const recordingSchema = z.strictObject({
    request: modelRequestSchema,
    sample: z.int().min(1).max(100),
    reply: modelReplySchema,
});

export type Recording = z.infer<typeof recordingSchema>;

/** Where recordings are kept. */
export interface RecordingStore {
    read(key: string): Recording | undefined;
    write(key: string, recording: Recording): void;
}

/** JSON with object keys in a fixed order, so equal values hash equally. */
function canonical(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(canonical).join(',')}]`;
    }

    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value)
            .filter(([, child]) => child !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(
                ([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`,
            );

        return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value);
}

/** The name a recording is filed under: a hash of the request and the try. */
export function recordingKey(request: ModelRequest, sample: number): string {
    return createHash('sha256')
        .update(canonical({ request, sample }))
        .digest('hex')
        .slice(0, 32);
}

/** Recordings as JSON files in one folder, one file per call. */
export function fileStore(directory: string): RecordingStore {
    const path = (key: string): string => {
        if (!/^[0-9a-f]{32}$/.test(key)) {
            throw new Error('A recording key is 32 hex characters.');
        }

        return join(directory, `${key}.json`);
    };

    return {
        read(key) {
            let text: string;

            try {
                text = readFileSync(path(key), 'utf8');
            } catch (error) {
                if (
                    error instanceof Error &&
                    'code' in error &&
                    error.code === 'ENOENT'
                ) {
                    return undefined;
                }

                throw error;
            }

            const parsed: unknown = JSON.parse(text);

            return parseAs(recordingSchema, 'recording', parsed);
        },
        write(key, recording) {
            mkdirSync(directory, { recursive: true });
            writeFileSync(
                path(key),
                `${JSON.stringify(recording, null, 4)}\n`,
                'utf8',
            );
        },
    };
}

/** Recordings kept in memory, for tests. */
export function memoryStore(): RecordingStore & { size(): number } {
    const kept = new Map<string, string>();

    return {
        read(key) {
            const text = kept.get(key);

            if (text === undefined) {
                return undefined;
            }

            const parsed: unknown = JSON.parse(text);

            return parseAs(recordingSchema, 'recording', parsed);
        },
        write(key, recording) {
            kept.set(key, JSON.stringify(recording));
        },
        size: () => kept.size,
    };
}

/** A request the recorded client has no saved reply for. */
export class MissingRecordingError extends Error {
    override name = 'MissingRecordingError';
}

/**
 * Answers from recordings only. An unknown request is an error: this
 * client never falls back to a live call, so demo mode and CI can
 * never cost anything.
 */
export function recordedClient(store: RecordingStore): ModelClient {
    return {
        complete(request, sample) {
            const asked = parseAs(modelRequestSchema, 'model request', request);
            const recording = store.read(recordingKey(asked, sample));

            if (recording === undefined) {
                return Promise.reject(
                    new MissingRecordingError(
                        `No recording for this request (model "${asked.model}", try ${sample}). ` +
                            'Recorded mode never calls a model.',
                    ),
                );
            }

            return Promise.resolve(recording.reply);
        },
    };
}

/**
 * Wraps a live client and saves every call. Requests and replies are
 * scrubbed of anything that looks like a real key before they are
 * written, and the caller gets the scrubbed reply, so a live run and
 * its replay see the same text.
 */
export function recordingClient(
    live: ModelClient,
    store: RecordingStore,
    secrets: readonly string[] = [],
): ModelClient {
    return {
        async complete(request, sample) {
            const asked = parseAs(modelRequestSchema, 'model request', request);
            const answered = await live.complete(asked, sample);
            const reply: ModelReply = parseAs(
                modelReplySchema,
                'model reply',
                scrubDeep(answered, secrets),
            );

            // The key comes from the request as sent, so a replay of the
            // same request finds it.
            store.write(recordingKey(asked, sample), {
                request: scrubDeep(asked, secrets),
                sample,
                reply,
            });

            return reply;
        },
    };
}
