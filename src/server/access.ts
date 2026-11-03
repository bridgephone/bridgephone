// Who may do what. Every rule from SPEC.md is checked here, on the server.
import { sql } from './db.ts'
import { type User, fail } from './context.ts'

export type Role = 'manager' | 'player'
export type TournamentState = 'draft' | 'running' | 'finished'

export async function clubAccess(user: User, clubId: number) {
  const [club] = await sql<{ id: number; name: string; role: Role | null }[]>`
    select c.id, c.name, m.role
    from clubs c left join memberships m on m.club_id = c.id and m.user_id = ${user.id}
    where c.id = ${clubId}
  `
  if (!club || (!club.role && !user.isSiteAdmin)) fail(404, 'Club not found')
  // A site admin can manage every club, so they can assign its club managers.
  return { club, canManage: club.role === 'manager' || user.isSiteAdmin }
}

export async function requireClubManager(user: User, clubId: number) {
  const access = await clubAccess(user, clubId)
  if (!access.canManage) fail(403, 'Only a club manager can do this')
  return access
}

export async function tournamentAccess(user: User, tournamentId: number) {
  const [tournament] = await sql<
    { id: number; clubId: number; name: string; state: TournamentState }[]
  >`select id, club_id, name, state from tournaments where id = ${tournamentId}`
  if (!tournament) fail(404, 'Tournament not found')
  const access = await clubAccess(user, tournament.clubId)
  return { ...access, tournament }
}

export async function requireDraftManager(user: User, tournamentId: number) {
  const access = await tournamentAccess(user, tournamentId)
  if (!access.canManage) fail(403, 'Only a club manager can do this')
  if (access.tournament.state !== 'draft') fail(409, 'The tournament has already started')
  return access
}
