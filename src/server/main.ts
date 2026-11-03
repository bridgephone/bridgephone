import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { api } from './app.ts'
import { migrate } from './db.ts'
import { env } from './env.ts'

await migrate()

// In production the same server also serves the built frontend (see Dockerfile).
api.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))
api.use('/*', serveStatic({ root: './dist/web' }))
api.get('*', serveStatic({ path: './dist/web/index.html' }))

serve({ fetch: api.fetch, port: env.port }, (info) => {
  console.log(`Bridgephone listening on http://localhost:${info.port}`)
})
