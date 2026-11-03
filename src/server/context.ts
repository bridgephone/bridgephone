import { OpenAPIHono, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export type User = {
  id: number
  email: string
  name: string | null
  isSiteAdmin: boolean
}

export type AppEnv = { Variables: { user: User | null } }

export function router() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) return c.json({ error: z.prettifyError(result.error) }, 400)
    },
  })
}

export function fail(status: 400 | 401 | 403 | 404 | 409 | 503, message: string): never {
  throw new HTTPException(status, { message })
}

export function requireUser(c: Context<AppEnv>): User {
  return c.get('user') ?? fail(401, 'Not logged in')
}

// Helpers to keep route definitions short.
export function json<T extends z.ZodType>(schema: T, description = 'OK') {
  return { description, content: { 'application/json': { schema } } }
}

export function jsonBody<T extends z.ZodType>(schema: T) {
  return { required: true, content: { 'application/json': { schema } } }
}

export const Ok = z.object({ ok: z.literal(true) })
