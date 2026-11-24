import { defineConfig } from 'vite-plus';

// Vite+ runs the linter (Oxlint), the formatter and the tests (Vitest).
// The dashboard's build is added with its first story.
export default defineConfig({
    test: {
        include: ['packages/**/*.test.ts'],
        environment: 'node',
    },
    lint: {
        ignorePatterns: ['node_modules/**'],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        ignorePatterns: [
            '.github/**',
            // Recorded runs are written by the runner, byte for byte.
            'runs/**',
        ],
    },
});
