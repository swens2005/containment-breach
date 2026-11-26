import { defineConfig } from 'vite-plus';

// The dashboard: a static site. `base: './'` lets it live in any folder
// of any host. Nothing is inlined as a data: URI, so the page's CSP can
// allow its own files only.
export default defineConfig({
    root: import.meta.dirname,
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsInlineLimit: 0,
        sourcemap: false,
    },
});
