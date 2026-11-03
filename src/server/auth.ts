import { randomBytes } from 'node:crypto'
import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { sql } from './db.ts'
import { env } from './env.ts'
import { type AppEnv, type User, fail, json, jsonBody, Ok, router } from './context.ts'

const SESSION_COOKIE = 'session'
const STATE_COOKIE = 'oauth_state'
const SESSION_DAYS = 30
const redirectUri = `${env.appUrl}/api/auth/google/callback`

const cookieOptions = {
  httpOnly: true,
  secure: env.secureCookies,
  sameSite: 'Lax',
  path: '/',
} as const

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  let user: User | null = null
  if (token) {
    const [row] = await sql<{ id: number; email: string; name: string | null }[]>`
      select u.id, u.email, u.name
      from sessions s join users u on u.id = s.user_id
      where s.token = ${token} and s.expires_at > now()
    `
    if (row) user = { ...row, isSiteAdmin: env.siteAdmins.includes(row.email) }
  }
  c.set('user', user)
  await next()
})

// Starts a session for a club member or site admin. Returns false for anyone else.
async function logIn(c: Context<AppEnv>, rawEmail: string, name: string | null) {
  const email = rawEmail.trim().toLowerCase()
  const isSiteAdmin = env.siteAdmins.includes(email)
  const [existing] = await sql<{ id: number; isMember: boolean }[]>`
    select id, exists (select 1 from memberships m where m.user_id = users.id) as is_member
    from users where email = ${email}
  `
  if (!existing?.isMember && !isSiteAdmin) return false

  const [user] = await sql<{ id: number }[]>`
    insert into users (email, name) values (${email}, ${name})
    on conflict (email) do update set name = coalesce(users.name, excluded.name)
    returning id
  `
  const token = randomBytes(32).toString('base64url')
  await sql`delete from sessions where expires_at < now()`
  await sql`
    insert into sessions (token, user_id, expires_at)
    values (${token}, ${user.id}, now() + make_interval(days => ${SESSION_DAYS}))
  `
  setCookie(c, SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_DAYS * 24 * 3600 })
  return true
}

const Me = z.object({
  user: z
    .object({ id: z.number(), email: z.string(), name: z.string().nullable(), isSiteAdmin: z.boolean() })
    .nullable(),
  googleLogin: z.boolean(),
  devLogin: z.boolean(),
})

export const auth = router()
  .openapi(
    createRoute({ method: 'get', path: '/me', responses: { 200: json(Me) } }),
    (c) =>
      c.json(
        { user: c.get('user'), googleLogin: env.googleClientId !== '', devLogin: env.devLogin },
        200,
      ),
  )
  .openapi(
    createRoute({ method: 'post', path: '/logout', responses: { 200: json(Ok) } }),
    async (c) => {
      const token = getCookie(c, SESSION_COOKIE)
      if (token) await sql`delete from sessions where token = ${token}`
      deleteCookie(c, SESSION_COOKIE, cookieOptions)
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/dev-login',
      description: 'Log in with only an email address. Only available when DEV_LOGIN=true.',
      request: { body: jsonBody(z.object({ email: z.string().trim().min(1) })) },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      if (!env.devLogin) fail(404, 'Not found')
      const { email } = c.req.valid('json')
      if (!(await logIn(c, email, null))) fail(403, `${email} is not a member of any club`)
      return c.json({ ok: true as const }, 200)
    },
  )
  // Google sign-in: redirect to Google, then Google redirects back to the callback.
  .get('/google', (c) => {
    if (!env.googleClientId) fail(503, 'Google sign-in is not configured')
    const state = randomBytes(16).toString('base64url')
    setCookie(c, STATE_COOKIE, state, { ...cookieOptions, path: '/api/auth', maxAge: 600 })
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    })
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })
  .get('/google/callback', async (c) => {
    const { code, state } = c.req.query()
    const expectedState = getCookie(c, STATE_COOKIE)
    deleteCookie(c, STATE_COOKIE, { ...cookieOptions, path: '/api/auth' })
    if (!code || !state || state !== expectedState) return c.redirect('/login?error=failed')

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) return c.redirect('/login?error=failed')
    const { access_token } = (await tokenResponse.json()) as { access_token: string }

    const infoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${access_token}` },
    })
    const info = (await infoResponse.json()) as {
      email?: string
      email_verified?: boolean
      name?: string
    }
    if (!infoResponse.ok || !info.email || !info.email_verified) {
      return c.redirect('/login?error=failed')
    }

    const loggedIn = await logIn(c, info.email, info.name ?? null)
    return c.redirect(loggedIn ? '/' : '/login?error=not-a-member')
  })
