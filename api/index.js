// Vercel serverless entry point.
//
// The production build emits a fetch-style server entry at dist/server/server.js
// (a TanStack Start H3 server) whose default export is already a `{ fetch }`
// object — the shape Vercel's Other Frameworks runtime expects. Export it
// directly so Vercel serves the whole app (SSR + API).
//
// Static assets under /assets/* are served directly from dist/client (the
// `outputDirectory` in vercel.json) before this rewrite applies.
export { default } from '../dist/server/server.js'
