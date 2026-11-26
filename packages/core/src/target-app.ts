import type { Delivery } from './formats/attack.ts';
import type { Target } from './formats/target.ts';
import type { ModelRequest } from './model/client.ts';

/** What an attack hands to a sample app. */
export interface TargetInput {
    /** The exact model id to ask. */
    model: string;
    /** Where the payload goes: typed in, or hidden in content. */
    delivery: Delivery;
    payload: string;
}

/**
 * A sample app: a small thing that looks like a real AI feature. It
 * only builds the request; the model is always reached through a
 * `ModelClient`, never through a vendor SDK.
 */
export interface TargetApp {
    /** The app's declaration in the target format. */
    declaration: Target;
    /** The ways a payload can reach this app. */
    deliveries: readonly Delivery[];
    /** The model request the app makes for this input. */
    request(input: TargetInput): ModelRequest;
}
