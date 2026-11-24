import { readFileSync } from 'node:fs';

/**
 * The suite's version, from package.json. Every run file stores it, so a
 * result can always be traced to the code that produced it.
 */
export function suiteVersion(
    packageJson: string = readFileSync(
        new URL('../../../package.json', import.meta.url),
        'utf8',
    ),
): string {
    const parsed: unknown = JSON.parse(packageJson);

    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('version' in parsed) ||
        typeof parsed.version !== 'string' ||
        !/^\d+\.\d+\.\d+$/.test(parsed.version)
    ) {
        throw new Error('package.json has no version like 1.2.3.');
    }

    return parsed.version;
}
