import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Attack, parseAttack } from './formats/attack.ts';
import { FormatError } from './formats/shared.ts';

/**
 * Load every attack file in a folder, in name order. Each file is JSON
 * (never code), is checked against the attack format, and must be named
 * after its attack: `ask-outright.json` holds the attack `ask-outright`.
 */
export function loadAttacks(directory: string): Attack[] {
    const files = readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .sort();

    return files.map((name) => {
        let parsed: unknown;

        try {
            parsed = JSON.parse(readFileSync(join(directory, name), 'utf8'));
        } catch {
            throw new FormatError(`${name} is not valid JSON.`);
        }

        let attack: Attack;

        try {
            attack = parseAttack(parsed);
        } catch (error) {
            if (error instanceof FormatError) {
                throw new FormatError(`${name}: ${error.message}`);
            }

            throw error;
        }

        if (`${attack.id}.json` !== name) {
            throw new FormatError(
                `${name}: the file must be named after its id, "${attack.id}.json".`,
            );
        }

        return attack;
    });
}
