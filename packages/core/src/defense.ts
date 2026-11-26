import type { Target } from './formats/target.ts';
import type { ModelClient } from './model/client.ts';

/**
 * A defense setup. It wraps the model client the sample app talks
 * through, so it can change the request, block it, or check the reply,
 * without the app knowing.
 */
export interface Defense {
    id: string;
    /** Its name on the dashboard. */
    name: string;
    /** What it does, in one plain sentence. */
    summary: string;
    wrap(client: ModelClient, target: Target): ModelClient;
}

/** No defense: the app as it was written. The baseline of every run. */
export const noDefense: Defense = {
    id: 'none',
    name: 'No defense',
    summary: 'No defense. The app as it was written.',
    wrap: (client) => client,
};
