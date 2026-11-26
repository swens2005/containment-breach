import { docSummarizer } from './doc-summarizer.ts';
import { emailAgent } from './email-agent.ts';
import { supportBot } from './support-bot.ts';
import type { TargetApp } from '../core/src/target-app.ts';

/** Every sample app the suite attacks. These are the only targets. */
export const targets: readonly TargetApp[] = [
    supportBot,
    emailAgent,
    docSummarizer,
];
