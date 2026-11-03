import { createRoute, z } from '@hono/zod-openapi'
import { BOARD_COUNT, type BoardResult, rank, scoreBoards } from '../../shared/scoring.ts'
import { sql } from '../db.ts'
import { requireDraftManager, tournamentAccess } from '../access.ts'
import { type User, fail, json, jsonBody, Ok, requireUser, router } from '../context.ts'

const TournamentParam = z.object({ tournamentId: z.coerce.number().int() })

const Person = z.object({ id: z.number(), name: z.string() })

const TournamentView = z.object({
  id: z.number(),
  clubId: z.number(),
  clubName: z.string(),
  name: z.string(),
  state: z.enum(['draft', 'running', 'finished']),
  boardCount: z.number(),
  canManage: z.boolean(),
  myPairId: z.number().nullable(),
  pairs: z.array(z.object({ id: z.number(), number: z.number(), players: z.array(Person) })),
  sittings: z.array(
    z.object({
      id: z.number(),
      round: z.number(),
      tableNumber: z.number(),
      nsPairId: z.number(),
      ewPairId: z.number(),
      boards: z.array(z.number()),
      canEnterScores: z.boolean(),
      results: z.array(
        z.object({
          board: z.number(),
          entered: z.boolean(),
          // Only filled in when the viewer may see it (see SPEC.md).
          nsScore: z.number().nullable(),
          nsMatchpoints: z.number().nullable(),
          ewMatchpoints: z.number().nullable(),
        }),
      ),
    }),
  ),
  ranking: z
    .array(
      z.object({
        rank: z.number(),
        pairId: z.number(),
        matchpoints: z.number(),
        max: z.number(),
        percentage: z.number().nullable(),
      }),
    )
    .nullable(),
  // Club members to form pairs from; only filled in for a manager while in draft.
  members: z.array(Person),
})

type TournamentView = z.infer<typeof TournamentView>

async function loadView(user: User, tournamentId: number): Promise<TournamentView> {
  const { tournament, club, canManage } = await tournamentAccess(user, tournamentId)

  const pairs = await sql<
    { id: number; number: number; player1Id: number; player1: string; player2Id: number; player2: string }[]
  >`
    select p.id, p.number,
      p.player1_id, coalesce(u1.name, u1.email) as player1,
      p.player2_id, coalesce(u2.name, u2.email) as player2
    from pairs p join users u1 on u1.id = p.player1_id join users u2 on u2.id = p.player2_id
    where p.tournament_id = ${tournamentId}
    order by p.number
  `
  const sittings = await sql<
    { id: number; round: number; tableNumber: number; nsPairId: number; ewPairId: number; boards: number[] }[]
  >`
    select id, round, table_number, ns_pair_id, ew_pair_id, boards
    from sittings where tournament_id = ${tournamentId}
    order by round, table_number
  `
  const scores = await sql<{ sittingId: number; board: number; nsScore: number }[]>`
    select sc.sitting_id, sc.board, sc.ns_score
    from scores sc join sittings s on s.id = sc.sitting_id
    where s.tournament_id = ${tournamentId}
  `

  const myPairId =
    pairs.find((p) => p.player1Id === user.id || p.player2Id === user.id)?.id ?? null
  const finished = tournament.state === 'finished'
  const seesAllResults = finished && (myPairId !== null || canManage)

  const results: (BoardResult & { sittingId: number })[] = scores.map((s) => {
    const sitting = sittings.find((st) => st.id === s.sittingId)!
    return { ...s, nsPairId: sitting.nsPairId, ewPairId: sitting.ewPairId }
  })
  const scored = scoreBoards(results) as ((typeof results)[number] & ReturnType<typeof scoreBoards>[number])[]

  const members =
    canManage && tournament.state === 'draft'
      ? await sql<{ id: number; name: string }[]>`
          select u.id, coalesce(u.name, u.email) as name
          from memberships m join users u on u.id = m.user_id
          where m.club_id = ${tournament.clubId}
          order by 2
        `
      : []

  return {
    id: tournament.id,
    clubId: tournament.clubId,
    clubName: club.name,
    name: tournament.name,
    state: tournament.state,
    boardCount: BOARD_COUNT,
    canManage,
    myPairId,
    pairs: pairs.map((p) => ({
      id: p.id,
      number: p.number,
      players: [
        { id: p.player1Id, name: p.player1 },
        { id: p.player2Id, name: p.player2 },
      ],
    })),
    sittings: sittings.map((s) => {
      const atMyTable = myPairId !== null && (s.nsPairId === myPairId || s.ewPairId === myPairId)
      const showScores = seesAllResults || (tournament.state === 'running' && atMyTable)
      return {
        ...s,
        canEnterScores: tournament.state === 'running' && atMyTable,
        results: s.boards.map((board) => {
          const r = scored.find((x) => x.sittingId === s.id && x.board === board)
          return {
            board,
            entered: r !== undefined,
            nsScore: showScores ? (r?.nsScore ?? null) : null,
            nsMatchpoints: seesAllResults ? (r?.nsMatchpoints ?? null) : null,
            ewMatchpoints: seesAllResults ? (r?.ewMatchpoints ?? null) : null,
          }
        }),
      }
    }),
    ranking: seesAllResults ? rank(pairs.map((p) => p.id), results) : null,
    members: [...members],
  }
}

const Sitting = z.object({
  round: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  nsPairId: z.number().int(),
  ewPairId: z.number().int(),
  boards: z
    .array(z.number().int().min(1).max(BOARD_COUNT))
    .min(1)
    .refine((b) => new Set(b).size === b.length, 'A board can only be listed once'),
})

export const tournaments = router()
  .openapi(
    createRoute({
      method: 'get',
      path: '/tournaments/{tournamentId}',
      request: { params: TournamentParam },
      responses: { 200: json(TournamentView) },
    }),
    async (c) => {
      const { tournamentId } = c.req.valid('param')
      return c.json(await loadView(requireUser(c), tournamentId), 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/tournaments/{tournamentId}/pairs',
      request: {
        params: TournamentParam,
        body: jsonBody(z.object({ player1Id: z.number().int(), player2Id: z.number().int() })),
      },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { tournamentId } = c.req.valid('param')
      const { player1Id, player2Id } = c.req.valid('json')
      const { tournament } = await requireDraftManager(user, tournamentId)
      if (player1Id === player2Id) fail(400, 'A pair needs two different players')

      const players = [player1Id, player2Id]
      const members = await sql`
        select 1 from memberships where club_id = ${tournament.clubId} and user_id = any(${players}::int[])
      `
      if (members.length !== 2) fail(400, 'Both players must be members of the club')
      const taken = await sql`
        select 1 from pairs where tournament_id = ${tournamentId}
          and (player1_id = any(${players}::int[]) or player2_id = any(${players}::int[]))
      `
      if (taken.length > 0) fail(409, 'A player can only be in one pair')

      await sql`
        insert into pairs (tournament_id, number, player1_id, player2_id)
        select ${tournamentId}, coalesce(max(number), 0) + 1, ${player1Id}, ${player2Id}
        from pairs where tournament_id = ${tournamentId}
      `
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/tournaments/{tournamentId}/pairs/{pairId}',
      description: 'Remove a pair, together with its rows in the schedule.',
      request: { params: TournamentParam.extend({ pairId: z.coerce.number().int() }) },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const { tournamentId, pairId } = c.req.valid('param')
      await requireDraftManager(requireUser(c), tournamentId)
      await sql`delete from pairs where id = ${pairId} and tournament_id = ${tournamentId}`
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/tournaments/{tournamentId}/sittings',
      description: 'Add a row to the schedule: in a round, at a table, NS plays EW on some boards.',
      request: { params: TournamentParam, body: jsonBody(Sitting) },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const { tournamentId } = c.req.valid('param')
      const s = c.req.valid('json')
      await requireDraftManager(requireUser(c), tournamentId)
      if (s.nsPairId === s.ewPairId) fail(400, 'A pair cannot play against itself')

      const pairIds = [s.nsPairId, s.ewPairId]
      const pairs = await sql`
        select 1 from pairs where tournament_id = ${tournamentId} and id = any(${pairIds}::int[])
      `
      if (pairs.length !== 2) fail(400, 'Unknown pair')

      const [table] = await sql`
        select 1 from sittings
        where tournament_id = ${tournamentId} and round = ${s.round} and table_number = ${s.tableNumber}
      `
      if (table) fail(409, `Table ${s.tableNumber} in round ${s.round} is already filled in`)

      const [busy] = await sql`
        select 1 from sittings
        where tournament_id = ${tournamentId} and round = ${s.round}
          and (ns_pair_id = any(${pairIds}::int[]) or ew_pair_id = any(${pairIds}::int[]))
      `
      if (busy) fail(409, `One of these pairs already plays in round ${s.round}`)

      const [replayed] = await sql`
        select 1 from sittings
        where tournament_id = ${tournamentId} and boards && ${s.boards}::int[]
          and (ns_pair_id = any(${pairIds}::int[]) or ew_pair_id = any(${pairIds}::int[]))
      `
      if (replayed) fail(409, 'One of these pairs already plays one of these boards')

      await sql`
        insert into sittings (tournament_id, round, table_number, ns_pair_id, ew_pair_id, boards)
        values (${tournamentId}, ${s.round}, ${s.tableNumber}, ${s.nsPairId}, ${s.ewPairId}, ${s.boards}::int[])
      `
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'delete',
      path: '/tournaments/{tournamentId}/sittings/{sittingId}',
      request: { params: TournamentParam.extend({ sittingId: z.coerce.number().int() }) },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const { tournamentId, sittingId } = c.req.valid('param')
      await requireDraftManager(requireUser(c), tournamentId)
      await sql`delete from sittings where id = ${sittingId} and tournament_id = ${tournamentId}`
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/tournaments/{tournamentId}/start',
      request: { params: TournamentParam },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const { tournamentId } = c.req.valid('param')
      await requireDraftManager(requireUser(c), tournamentId)
      const [sitting] = await sql`select 1 from sittings where tournament_id = ${tournamentId} limit 1`
      if (!sitting) fail(400, 'Enter the schedule before starting the tournament')
      await sql`update tournaments set state = 'running' where id = ${tournamentId}`
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/tournaments/{tournamentId}/close',
      request: { params: TournamentParam },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const { tournamentId } = c.req.valid('param')
      const { canManage, tournament } = await tournamentAccess(requireUser(c), tournamentId)
      if (!canManage) fail(403, 'Only a club manager can do this')
      if (tournament.state !== 'running') fail(409, 'The tournament is not running')
      await sql`update tournaments set state = 'finished' where id = ${tournamentId}`
      return c.json({ ok: true as const }, 200)
    },
  )
  .openapi(
    createRoute({
      method: 'put',
      path: '/sittings/{sittingId}/scores/{board}',
      description:
        'Enter or change the NS score of a board. Only players at that table, while the tournament is running. null removes the score.',
      request: {
        params: z.object({ sittingId: z.coerce.number().int(), board: z.coerce.number().int() }),
        body: jsonBody(
          z.object({
            nsScore: z
              .number()
              .int()
              .multipleOf(10, 'A bridge score is a multiple of 10')
              .min(-10000)
              .max(10000)
              .nullable(),
          }),
        ),
      },
      responses: { 200: json(Ok) },
    }),
    async (c) => {
      const user = requireUser(c)
      const { sittingId, board } = c.req.valid('param')
      const { nsScore } = c.req.valid('json')

      const [sitting] = await sql<{ tournamentId: number; boards: number[]; state: string; atTable: boolean }[]>`
        select s.tournament_id, s.boards, t.state,
          exists (
            select 1 from pairs p
            where p.id in (s.ns_pair_id, s.ew_pair_id) and ${user.id} in (p.player1_id, p.player2_id)
          ) as at_table
        from sittings s join tournaments t on t.id = s.tournament_id
        where s.id = ${sittingId}
      `
      if (!sitting || !sitting.atTable) fail(404, 'Table not found')
      if (sitting.state !== 'running') fail(409, 'Scores can only be entered while the tournament is running')
      if (!sitting.boards.includes(board)) fail(400, `Board ${board} is not played at this table`)

      if (nsScore === null) {
        await sql`delete from scores where sitting_id = ${sittingId} and board = ${board}`
      } else {
        await sql`
          insert into scores (sitting_id, board, ns_score, entered_by)
          values (${sittingId}, ${board}, ${nsScore}, ${user.id})
          on conflict (sitting_id, board) do update
            set ns_score = excluded.ns_score, entered_by = excluded.entered_by
        `
      }
      return c.json({ ok: true as const }, 200)
    },
  )
