import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rank, scoreBoards } from './scoring.ts'

test('a score gets 2 per score it beats and 1 per tie', () => {
  const scored = scoreBoards([
    { board: 1, nsPairId: 1, ewPairId: 2, nsScore: 420 },
    { board: 1, nsPairId: 3, ewPairId: 4, nsScore: 420 },
    { board: 1, nsPairId: 5, ewPairId: 6, nsScore: -50 },
  ])
  assert.deepEqual(
    scored.map((s) => [s.nsMatchpoints, s.ewMatchpoints, s.max]),
    [
      [3, 1, 4],
      [3, 1, 4],
      [0, 4, 4],
    ],
  )
})

test('boards are scored independently', () => {
  const scored = scoreBoards([
    { board: 1, nsPairId: 1, ewPairId: 2, nsScore: 100 },
    { board: 2, nsPairId: 3, ewPairId: 4, nsScore: -100 },
  ])
  assert.deepEqual(scored.map((s) => s.max), [0, 0])
})

test('ranking uses the percentage of the boards each pair played', () => {
  const ranking = rank(
    [1, 2, 3, 4],
    [
      { board: 1, nsPairId: 1, ewPairId: 2, nsScore: 140 },
      { board: 1, nsPairId: 3, ewPairId: 4, nsScore: 110 },
      { board: 2, nsPairId: 1, ewPairId: 2, nsScore: -100 },
      { board: 2, nsPairId: 3, ewPairId: 4, nsScore: -100 },
    ],
  )
  assert.deepEqual(
    ranking.map((r) => [r.rank, r.pairId, r.matchpoints, r.max, r.percentage]),
    [
      [1, 1, 3, 4, 75],
      [1, 4, 3, 4, 75],
      [3, 2, 1, 4, 25],
      [3, 3, 1, 4, 25],
    ],
  )
})

test('a pair without comparable boards has no percentage and ranks last', () => {
  const ranking = rank([1, 2, 3], [{ board: 1, nsPairId: 1, ewPairId: 2, nsScore: 50 }])
  assert.deepEqual(ranking.map((r) => r.percentage), [null, null, null])
  assert.deepEqual(ranking.map((r) => r.rank), [1, 1, 1])
})
