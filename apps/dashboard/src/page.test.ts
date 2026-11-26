import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const dashboard = join(import.meta.dirname, '..');
const page = readFileSync(join(dashboard, 'index.html'), 'utf8');
const site = 'https://codelaunch.nl/containment-breach/';

function content(pattern: RegExp): string {
    const found = pattern.exec(page);

    if (found?.[1] === undefined) {
        throw new Error(`The page has no ${String(pattern)}.`);
    }

    return found[1];
}

describe('the dashboard page', () => {
    it('allows its own files only', () => {
        const policy = content(
            /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
        );

        expect(policy.split('; ')).toEqual([
            "default-src 'none'",
            "script-src 'self'",
            "style-src 'self'",
            "img-src 'self'",
            "font-src 'self'",
            "connect-src 'self'",
            "base-uri 'none'",
            "form-action 'none'",
        ]);
        expect(page).not.toMatch(/<style|style="|<script(?![^>]*\bsrc=)/);
    });

    it('offers a preview picture that is one of its own files', () => {
        const picture = content(/property="og:image"\s+content="([^"]+)"/);

        expect(picture.startsWith(site)).toBe(true);
        expect(
            existsSync(join(dashboard, 'public', picture.slice(site.length))),
        ).toBe(true);
        expect(content(/rel="canonical"\s+href="([^"]+)"/)).toBe(site);
        expect(content(/property="og:url"\s+content="([^"]+)"/)).toBe(site);
    });
});
