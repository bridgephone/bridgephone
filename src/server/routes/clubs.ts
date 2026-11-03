import { createRoute, z } from '@hono/zod-openapi'
import { sql } from '../db.ts'
import { clubAccess, requireClubManager, type Role } from '../access.ts'
import { fail, json, jsonBody, Ok, requireUser, router } from '../context.ts'

const RoleSchema = z.enum(['manager', 'player'])
const StateSchema = z.enum(['draft', 'running', 'finished'])
const ClubParam = z.object({ clubId: z.coerce.number().int() })

const ClubSummary = z.object({ id: z.number(), name: z.string(), role: RoleSchema.nullable() })

const ClubDetail = z.object({
  id: z.number(),
  name: z.string(),
  canManage: z.boolean(),
  members: z.array(
    z.object({ id: z.number(), email: z.string(), name: z.string().nullable(), role: RoleSchema }),
  ),
  tournaments: z.array(z.object({ id: z.number(), name: z.string(), state: StateSchema })),
})

export const clubs = router()
  .openapi(
    createRoute({ method: 'get', path: '/clubs', responses: { 200: json(z.array(ClubSummary)) } }),
    async (c) => {
      const user = requireUser(c)
      const rows = await sql<z.infer<typeof ClubSummary>[]>`
        select c.id, c.name, m.role
        from clubs c left join memberships m on m.club_id = c.id and m.user_id = ${user.id}
        where m.role is not null or ${user.isSiteAdmin}
        order by c.name
      `
      return c.json([...rows], 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/clubs',
      description: 'Create a club. Site admins only.',
      request: { body: jsonBody(z.object({ name: z.string().trim().min(1) })) },
      responses: { 200: json(z.object({ id: z.number() })) },
    }),
    async (c) => {
      const user = requireUser(c)
      if (!user.isSiteAdmin) fail(403, 'Only a site admin can create clubs')
      const { name } = c.req.valid('json')
      const [club] = await sql<{ id: number }[]>`insert into clubs (name) values (${name}) returning id`
      return c.json({ id: club.id }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/clubs/{clubId}',
      request: { params: ClubParam },
      responses: { 200: json(ClubDetail) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { clubId } = c.req.valid('param')
      const { club, canManage } = await clubAccess(user, clubId)
      const members = await sql<z.infer<typeof ClubDetail>['members']>`
        select u.id, u.email, u.name, m.role
        from memberships m join users u on u.id = m.user_id
        where m.club_id = ${clubId}
        order by m.role, coalesce(u.name, u.email)
      `
      const tournaments = await sql<z.infer<typeof ClubDetail>['tournaments']>`
        select id, name, state from tournaments where club_id = ${clubId} order by created_at desc
      `
      return c.json(
        { id: club.id, name: club.name, canManage, members: [...members], tournaments: [...tournaments] },
        200,
      )
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/clubs/{clubId}/members',
      description:
        'Add a member by email address, or change their role. Only a site admin can assign or remove club managers.',
      request: {
        params: ClubParam,
        body: jsonBody(
          z.object({
            email: z.email().trim().toLowerCase(),
            name: z.string().trim().optional(),
            role: RoleSchema,
          }),
        ),
      },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { clubId } = c.req.valid('param')
      const { email, name, role } = c.req.valid('json')
      await requireClubManager(user, clubId)

      const [current] = await sql<{ role: Role }[]>`
        select m.role from memberships m join users u on u.id = m.user_id
        where m.club_id = ${clubId} and u.email = ${email}
      `
      if ((role === 'manager' || current?.role === 'manager') && !user.isSiteAdmin) {
        fail(403, 'Only a site admin can assign club managers')
      }

      const [member] = await sql<{ id: number }[]>`
        insert into users (email, name) values (${email}, ${name || null})
        on conflict (email) do update set name = coalesce(excluded.name, users.name)
        returning id
      `
      await sql`
        insert into memberships (club_id, user_id, role) values (${clubId}, ${member.id}, ${role})
        on conflict (club_id, user_id) do update set role = excluded.role
      `
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/clubs/{clubId}/members/{userId}',
      request: { params: ClubParam.extend({ userId: z.coerce.number().int() }) },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { clubId, userId } = c.req.valid('param')
      await requireClubManager(user, clubId)
      const [current] = await sql<{ role: Role }[]>`
        select role from memberships where club_id = ${clubId} and user_id = ${userId}
      `
      if (!current) fail(404, 'Member not found')
      if (current.role === 'manager' && !user.isSiteAdmin) {
        fail(403, 'Only a site admin can remove club managers')
      }
      await sql`delete from memberships where club_id = ${clubId} and user_id = ${userId}`
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/clubs/{clubId}/tournaments',
      request: {
        params: ClubParam,
        body: jsonBody(z.object({ name: z.string().trim().min(1) })),
      },
      responses: { 200: json(z.object({ id: z.number() })) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { clubId } = c.req.valid('param')
      const { name } = c.req.valid('json')
      await requireClubManager(user, clubId)
      const [tournament] = await sql<{ id: number }[]>`
        insert into tournaments (club_id, name) values (${clubId}, ${name}) returning id
      `
      return c.json({ id: tournament.id }, 200)
    },
  )
