// Builds the attestation server (server/attest.ts) into one file with everything it needs, game rules included:
// `npm run server:build` -> server-dist/attest.mjs. The server needs Node 18 or newer and nothing else.
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  // The game's pictures belong to the site, not the server.
  publicDir: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: 'server/attest.ts',
    outDir: 'server-dist',
    emptyOutDir: true,
    target: 'node18',
    minify: false,
    rollupOptions: { output: { entryFileNames: 'attest.mjs', inlineDynamicImports: true } },
  },
})
