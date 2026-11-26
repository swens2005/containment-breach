import { fileURLToPath } from 'node:url';
import { anthropicClient } from '../core/src/model/anthropic.ts';
import { main } from './cb.ts';

// The command line entry: `npm run cb -- run`.
process.exitCode = await main(process.argv.slice(2), {
    env: process.env,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    now: () => new Date(),
    print: (line) => {
        process.stdout.write(`${line}\n`);
    },
    liveClient: () => anthropicClient(),
});
