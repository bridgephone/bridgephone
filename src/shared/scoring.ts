// Matchpoint scoring for a pairs tournament. See "Scoring" in SPEC.md.

export const BOARD_COUNT = 24

export type BoardResult = {
  board: number
  nsPairId: number
  ewPairId: number
  nsScore: number
}

export type ScoredResult = BoardResult & {
  nsMatchpoints: number
  ewMatchpoints: number
  // Matchpoints available on this board: 2 for every other table that played it.
  max: number
}

export type RankingRow = {
  rank: number
  pairId: number
  matchpoints: number
  max: number
  // null when none of the pair's boards could be compared with another table.
  percentage: number | null
}

export function scoreBoards(results: BoardResult[]): ScoredResult[] {
  return results.map((result) => {
    const others = results.filter((r) => r.board === result.board && r !== result)
    const beaten = others.filter((r) => result.nsScore > r.nsScore).length
    const tied = others.filter((r) => result.nsScore === r.nsScore).length
    const max = 2 * others.length
    const nsMatchpoints = 2 * beaten + tied
    return { ...result, nsMatchpoints, ewMatchpoints: max - nsMatchpoints, max }
  })
}

export function rank(pairIds: number[], results: BoardResult[]): RankingRow[] {
  const totals = new Map(pairIds.map((id) => [id, { matchpoints: 0, max: 0 }]))
  for (const r of scoreBoards(results)) {
    const ns = totals.get(r.nsPairId)
    const ew = totals.get(r.ewPairId)
    if (ns) {
      ns.matchpoints += r.nsMatchpoints
      ns.max += r.max
    }
    if (ew) {
      ew.matchpoints += r.ewMatchpoints
      ew.max += r.max
    }
  }

  const rows = [...totals].map(([pairId, t]) => ({
    pairId,
    ...t,
    percentage: t.max > 0 ? (100 * t.matchpoints) / t.max : null,
  }))
  rows.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))

  // Pairs with the same percentage share a rank.
  return rows.map((row, i) => {
    const firstEqual = rows.findIndex((r) => r.percentage === row.percentage)
    return { rank: (firstEqual === -1 ? i : firstEqual) + 1, ...row }
  })
}
