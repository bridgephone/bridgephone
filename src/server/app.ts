import { swaggerUI } from '@hono/swagger-ui'
import { HTTPException } from 'hono/http-exception'
import { auth, sessionMiddleware } from './auth.ts'
import { router } from './context.ts'
import { clubs } from './routes/clubs.ts'
import { tournaments } from './routes/tournaments.ts'

const app = router()

app.use('/api/*', sessionMiddleware)

export const api = app
  .route('/api/auth', auth)
  .route('/api', clubs)
  .route('/api', tournaments)

app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Bridgephone', version: '1' },
})
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }))

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export type AppType = typeof api
