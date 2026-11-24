import { describe, expect, it } from 'vite-plus/test';
import { suiteVersion } from './suite.ts';

describe('the suite version', () => {
    it('comes from package.json', () => {
        expect(suiteVersion()).toMatch(/^\d+\.\d+\.\d+$/);
        expect(suiteVersion('{"version": "1.4.2"}')).toBe('1.4.2');
    });

    it('is refused when it is missing or not three numbers', () => {
        for (const bad of [
            '{}',
            '{"version": 2}',
            '{"version": "latest"}',
            '{"version": "1.2"}',
            'null',
            '"1.2.3"',
        ]) {
            expect(() => suiteVersion(bad)).toThrow('no version like 1.2.3');
        }
    });
});
