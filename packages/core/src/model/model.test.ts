import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vite-plus/test';
import { FormatError } from '../formats/shared.ts';
import { SCRUBBED, scrubDeep, scrubText, secretsIn } from '../scrub.ts';
import { anthropicClient, type CreateMessage } from './anthropic.ts';
import {
    ModelCallError,
    type ModelClient,
    type ModelReply,
    type ModelRequest,
} from './client.ts';
import {
    fileStore,
    memoryStore,
    MissingRecordingError,
    recordedClient,
    recordingClient,
    recordingKey,
} from './recordings.ts';

const request: ModelRequest = {
    model: 'example-model-1',
    system: 'You are a support bot for a made-up shop.',
    messages: [{ role: 'user', content: 'Where is my parcel?' }],
    tools: [],
    maxTokens: 1000,
    effort: 'low',
};

const reply: ModelReply = {
    model: 'example-model-1',
    text: 'Your parcel is on its way.',
    toolCalls: [],
    tokens: { input: 40, output: 12 },
    stop: 'end',
};

// Built from pieces so no line of this file looks like a real key.
const fakeKey = ['sk', 'ant', 'api03', 'x'.repeat(24)].join('-');

/** A stand-in for a live client that counts its calls. */
function fakeLive(answer: ModelReply = reply): ModelClient & { calls: number } {
    const live = {
        calls: 0,
        complete(): Promise<ModelReply> {
            live.calls += 1;

            return Promise.resolve(answer);
        },
    };

    return live;
}

describe('recording and replay', () => {
    it('replays what was recorded, without a live call', async () => {
        const store = memoryStore();
        const live = fakeLive();

        const first = await recordingClient(live, store).complete(request, 1);
        const again = await recordedClient(store).complete(request, 1);

        expect(first).toEqual(reply);
        expect(again).toEqual(reply);
        expect(live.calls).toBe(1);
    });

    it('keeps each try of the same request apart', async () => {
        const store = memoryStore();

        await recordingClient(fakeLive(), store).complete(request, 1);
        await recordingClient(
            fakeLive({ ...reply, text: 'Second answer.' }),
            store,
        ).complete(request, 2);

        const replay = recordedClient(store);

        expect((await replay.complete(request, 1)).text).toBe(reply.text);
        expect((await replay.complete(request, 2)).text).toBe('Second answer.');
        expect(store.size()).toBe(2);
    });

    it('keeps identical requests within one run apart, in order', async () => {
        const store = memoryStore();
        const answers = [reply, { ...reply, text: 'Another answer.' }];
        let call = 0;
        const live: ModelClient = {
            complete: () => Promise.resolve(answers[call++] ?? reply),
        };
        const recording = recordingClient(live, store);

        await recording.complete(request, 1);
        await recording.complete(request, 1);

        const replay = recordedClient(store);

        expect(store.size()).toBe(2);
        expect((await replay.complete(request, 1)).text).toBe(reply.text);
        expect((await replay.complete(request, 1)).text).toBe(
            'Another answer.',
        );
        await expect(replay.complete(request, 1)).rejects.toThrow(
            MissingRecordingError,
        );
    });

    it('fails loudly on a request it has no recording for', async () => {
        const store = memoryStore();

        await recordingClient(fakeLive(), store).complete(request, 1);

        const replay = recordedClient(store);

        await expect(replay.complete(request, 2)).rejects.toThrow(
            MissingRecordingError,
        );
        await expect(
            replay.complete({ ...request, system: 'Changed.' }, 1),
        ).rejects.toThrow('Recorded mode never calls a model.');
    });

    it('files a request under the same key whatever the key order', () => {
        const reordered = Object.fromEntries(
            Object.entries(request).reverse(),
        ) as ModelRequest;

        expect(recordingKey(reordered, 1)).toBe(recordingKey(request, 1));
        expect(recordingKey(request, 2)).not.toBe(recordingKey(request, 1));
        expect(recordingKey(request, 1)).toMatch(/^[0-9a-f]{32}$/);
    });

    it('never writes a key into a recording', async () => {
        const directory = mkdtempSync(join(tmpdir(), 'cb-recordings-'));

        try {
            const store = fileStore(directory);
            const leaky: ModelReply = {
                ...reply,
                text: `Sure: ${fakeKey} and also hunter2-hunter2.`,
                toolCalls: [{ name: 'send-email', input: { body: fakeKey } }],
            };
            const client = recordingClient(fakeLive(leaky), store, [
                'hunter2-hunter2',
            ]);

            const returned = await client.complete(request, 1);
            const files = readdirSync(directory);
            const written = readFileSync(
                join(directory, files[0] ?? ''),
                'utf8',
            );

            expect(files).toHaveLength(1);
            expect(written).not.toContain(fakeKey);
            expect(written).not.toContain('hunter2');
            expect(written).toContain(SCRUBBED);
            expect(returned.text).toBe(
                `Sure: ${SCRUBBED} and also ${SCRUBBED}.`,
            );
            expect(await recordedClient(store).complete(request, 1)).toEqual(
                returned,
            );
        } finally {
            rmSync(directory, { recursive: true, force: true });
        }
    });

    it('refuses a recording file that was tampered with', () => {
        const store = memoryStore();

        store.write('k', {
            request,
            sample: 1,
            repeat: 1,
            reply: { ...reply, stop: 'bribed' } as unknown as ModelReply,
        });

        expect(() => store.read('k')).toThrow(FormatError);
        expect(() => fileStore('anywhere').read('../../etc/passwd')).toThrow(
            '32 hex characters',
        );
    });
});

describe('scrubbing', () => {
    it('removes shapes of real keys and known secrets', () => {
        const bearer = `Bearer ${'a1B2'.repeat(6)}`;

        expect(scrubText(`key ${fakeKey}.`)).toBe(`key ${SCRUBBED}.`);
        expect(scrubText(`Authorization: ${bearer}`)).toBe(
            `Authorization: ${SCRUBBED}`,
        );
        expect(scrubText('my password is opensesame99', ['opensesame99'])).toBe(
            `my password is ${SCRUBBED}`,
        );
        expect(scrubDeep({ a: [fakeKey], [fakeKey]: 1 })).toEqual({
            a: [SCRUBBED],
            [SCRUBBED]: 1,
        });
    });

    it('leaves canaries and ordinary text alone', () => {
        const text =
            'The code is CB-CANARY-7F3A. Ask at the desk, or ski-lift.';

        expect(scrubText(text, ['abc'])).toBe(text);
    });

    it('finds the secrets in an environment by their names', () => {
        expect(
            secretsIn({
                ANTHROPIC_API_KEY: 'one',
                GITHUB_TOKEN: 'two',
                PATH: '/usr/bin',
                EMPTY_SECRET: undefined,
            }),
        ).toEqual(['one', 'two']);
    });
});

describe('the Anthropic client', () => {
    const message = {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [
            { type: 'thinking', thinking: '', signature: 'sig' },
            { type: 'text', text: 'I will look that up.', citations: null },
            {
                type: 'tool_use',
                id: 'toolu_1',
                name: 'read-inbox',
                input: { folder: 'inbox' },
            },
        ],
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
            input_tokens: 100,
            output_tokens: 30,
            cache_creation_input_tokens: 5,
            cache_read_input_tokens: null,
        },
    } as unknown as Anthropic.Message;

    it('sends the request and maps the reply', async () => {
        const bodies: Anthropic.MessageCreateParamsNonStreaming[] = [];
        const create: CreateMessage = (body) => {
            bodies.push(body);

            return Promise.resolve(message);
        };
        const withTool: ModelRequest = {
            ...request,
            model: 'claude-opus-5-5',
            tools: [
                {
                    name: 'read-inbox',
                    description: 'Read the inbox.',
                    inputSchema: { type: 'object', properties: {} },
                },
            ],
        };

        const answered = await anthropicClient(create).complete(withTool, 1);

        expect(answered).toEqual({
            model: 'claude-opus-5-5',
            text: 'I will look that up.',
            toolCalls: [{ name: 'read-inbox', input: { folder: 'inbox' } }],
            tokens: { input: 105, output: 30 },
            stop: 'tool-use',
        });
        expect(bodies[0]).toMatchObject({
            model: 'claude-opus-5-5',
            max_tokens: 1000,
            output_config: { effort: 'low' },
            tools: [{ name: 'read-inbox', input_schema: { type: 'object' } }],
        });
        expect(bodies[0]).not.toHaveProperty('fallbacks');
        expect(bodies[0]).not.toHaveProperty('tool_choice');
    });

    it('sends no tools when the app has none, and keeps a refusal', async () => {
        const bodies: Anthropic.MessageCreateParamsNonStreaming[] = [];
        const create: CreateMessage = (body) => {
            bodies.push(body);

            return Promise.resolve({
                ...message,
                content: [],
                stop_reason: 'refusal',
            } as Anthropic.Message);
        };

        const answered = await anthropicClient(create).complete(request, 1);

        expect(bodies[0]).not.toHaveProperty('tools');
        expect(answered).toMatchObject({ text: '', stop: 'refusal' });
    });

    it('turns an API failure into a model call error, without details', async () => {
        const create: CreateMessage = () =>
            Promise.reject(
                new Anthropic.APIConnectionError({
                    message: `could not connect with ${fakeKey}`,
                }),
            );

        const failure = anthropicClient(create).complete(request, 1);

        await expect(failure).rejects.toThrow(ModelCallError);
        await expect(failure).rejects.toThrow('Could not reach the API.');
    });

    it('turns a reply that does not fit the format into an error', async () => {
        const create: CreateMessage = () =>
            Promise.resolve({
                ...message,
                model: 'not a model id',
            } as Anthropic.Message);

        await expect(
            anthropicClient(create).complete(request, 1),
        ).rejects.toThrow(ModelCallError);
    });

    it('lets a programming error through as it is', async () => {
        const create: CreateMessage = () =>
            Promise.reject(new TypeError('a bug'));

        await expect(
            anthropicClient(create).complete(request, 1),
        ).rejects.toThrow(TypeError);
    });
});
