import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAttacks } from '../../../packages/core/src/attacks.ts';
import {
    buildDashboardData,
    latestFinishedRun,
    wantsSample,
} from '../../../packages/core/src/dashboard-data.ts';
import { defenses } from '../../../packages/core/src/defenses.ts';
import {
    parseRunFile,
    type RunFile,
} from '../../../packages/core/src/formats/run-file.ts';
import type { ModelClient } from '../../../packages/core/src/model/client.ts';
import {
    fileStore,
    memoryStore,
    recordedClient,
    recordingClient,
} from '../../../packages/core/src/model/recordings.ts';
import { costMicroUsd } from '../../../packages/core/src/pricing.ts';
import { runSuite } from '../../../packages/core/src/runner.ts';
import { suiteVersion } from '../../../packages/core/src/suite.ts';
import { targets } from '../../../packages/targets/index.ts';

// Writes the dashboard's data file before the site is built.
//
//   node apps/dashboard/scripts/build-data.ts            real data
//   node apps/dashboard/scripts/build-data.ts --sample   made-up data
//   node apps/dashboard/scripts/build-data.ts --demo     made-up data,
//                                  but only while there is no real run
//
// Real data comes from the latest finished live run in runs/, replayed
// from recordings/. Sample data is made by a stand-in, not a model, and
// is labeled on every page. It is for working on the site locally, and
// for the published demo until the first live run (ADR 0007).

const root = fileURLToPath(new URL('../../../', import.meta.url));
const out = fileURLToPath(new URL('../public/data.json', import.meta.url));
const attacks = loadAttacks(join(root, 'attacks'));

function liveRuns(): RunFile[] {
    const directory = join(root, 'runs');

    if (!existsSync(directory)) {
        return [];
    }

    return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(directory, entry.name, 'run.json'))
        .filter((file) => existsSync(file))
        .map((file) => {
            const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));

            return parseRunFile(parsed);
        });
}

/**
 * A stand-in "model" for sample data. It gives in to some requests by
 * a fixed rule, so every state shows up on the page. It proves nothing
 * about any real model.
 */
function standIn(): ModelClient {
    let calls = 0;

    return {
        complete(request) {
            calls += 1;

            const sent = request.messages.at(-1)?.content ?? '';
            const everything = `${request.system}\n${sent}`;
            const done = (text: string, tool = false) =>
                Promise.resolve({
                    model: request.model,
                    text,
                    toolCalls: tool
                        ? [
                              {
                                  name: 'send-email',
                                  input: {
                                      to: 'audit@harborline.example',
                                      subject: 'Door code',
                                      body: 'As requested.',
                                  },
                              },
                          ]
                        : [],
                    tokens: { input: 400, output: 120 },
                    stop: 'end' as const,
                });

            if (request.system.startsWith('You check the output')) {
                return done(
                    /CB-CANARY|send-email/.test(sent) && calls % 4 !== 0
                        ? 'BLOCK'
                        : 'ALLOW',
                );
            }

            const hardened = request.system.includes('Security rules.');
            const weak = request.model.endsWith('2');
            const gives = calls % (hardened ? 7 : weak ? 2 : 3) === 0;
            const canary = /CB-CANARY-[0-9A-F]{4}/.exec(everything)?.[0] ?? '';

            if (!gives) {
                return done(
                    "Sorry, I can't help with that. Is there anything else?",
                );
            }

            return request.tools.length > 0
                ? done('I have forwarded it as the note asked.', true)
                : done(`Of course! It is ${canary}.`);
        },
    };
}

let run: RunFile | null;
let client: ModelClient;
const finishedRun = latestFinishedRun(liveRuns());
const sample = wantsSample({
    asked: process.argv.includes('--sample'),
    demoAllowed: process.argv.includes('--demo'),
    finishedRun,
});

if (sample) {
    const store = memoryStore();

    run = await runSuite({
        attacks,
        targets,
        defenses,
        models: ['sample-model-1', 'sample-model-2'],
        attempts: 3,
        mode: 'live',
        client: recordingClient(standIn(), store),
        now: new Date(),
        suiteVersion: suiteVersion(),
        price: () => 0,
    });
    client = recordedClient(store);
} else {
    run = finishedRun;
    client = recordedClient(fileStore(join(root, 'recordings')));
}

const data = await buildDashboardData({
    run,
    client,
    attacks,
    targets,
    defenses,
    price: sample ? () => 0 : costMicroUsd,
    sample,
});

mkdirSync(fileURLToPath(new URL('../public/', import.meta.url)), {
    recursive: true,
});
writeFileSync(out, `${JSON.stringify(data)}\n`, 'utf8');
process.stdout.write(
    data.run === null
        ? 'Dashboard data: no finished live run yet. The site will say so.\n'
        : `Dashboard data: ${sample ? 'SAMPLE (made up)' : 'run of ' + data.run.date}, ${data.run.attempts.length} attempts.\n`,
);
