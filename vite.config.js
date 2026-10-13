import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Vite's dev server can copy this config into node_modules/.vite-temp/ before running it, which
// breaks a plain relative import() once it resolves later than config-load time (configureServer's
// request handler, below, runs lazily per-request) — a plain string path no longer points at the
// right place from there. An absolute file:// URL built from this file's own real location isn't
// affected by that copy.
const releaseNotesUrl = pathToFileURL(path.resolve(import.meta.dirname, 'src/data/releaseNotes.js')).href

// Emits src/data/releaseNotes.js's array as a plain, unhashed dist/release-notes.json — a tab
// that's been open since before a deploy fetches this (see useReleaseNotesCheck.js) to notice a
// new version and show what changed, without having to load any of the new JS to find out.
function releaseNotesAsset() {
  return {
    name: 'emit-release-notes-json',
    async generateBundle() {
      const { RELEASE_NOTES } = await import(releaseNotesUrl)
      this.emitFile({ type: 'asset', fileName: 'release-notes.json', source: JSON.stringify(RELEASE_NOTES) })
    },
    configureServer(server) {
      // Dev has no build step to hook, so serve the same file straight off disk instead — cache-
      // busted on every import so an edit shows up without restarting the dev server.
      server.middlewares.use('/release-notes.json', async (req, res) => {
        const { RELEASE_NOTES } = await import(`${releaseNotesUrl}?t=${Date.now()}`)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(RELEASE_NOTES))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), releaseNotesAsset()],
  server: {
    // Mirrors the Vercel rewrite in vercel.json — API_URL (apiUrl.js) is always the relative '/api'
    // so the browser treats the backend as same-origin (see that file for why), which only works
    // if *something* actually forwards it to the real backend. In production that's Vercel's edge;
    // locally it's this dev-server proxy. VITE_DEV_API_TARGET lets this point at a backend running
    // somewhere other than localhost:5000 without editing this file.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
