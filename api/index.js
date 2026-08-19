// Vercel serverless entry point.
//
// The production build emits a fetch-style server entry at dist/server/server.js
// (a TanStack Start H3 server). This function imports it and re-exports the
// fetch handler so Vercel's Node.js runtime serves the whole app (SSR + API).
//
// Static assets under /assets/* are served directly from dist/client (the
// `outputDirectory` in vercel.json) before this rewrite applies.
import server from '../dist/server/server.js'

export default async function handler(request) {
  return server.fetch(request)
}
