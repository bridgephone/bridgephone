import { A, useParams } from '@solidjs/router'
import { createResource, createSignal, For, Show } from 'solid-js'
import { api, call, createAction, type TournamentView } from '../api.ts'

type Sitting = TournamentView['sittings'][number]

export function Tournament() {
  const params = useParams<{ tournamentId: string }>()
  const [view, { refetch }] = createResource(
    () => params.tournamentId,
    (tournamentId) => call(api.tournaments[':tournamentId'].$get({ param: { tournamentId } })),
  )

  return (
    <Show when={view.latest} fallback={<Show when={view.error}><p class="error">Tournament not found.</p></Show>}>
      {(t) => (
        <section>
          <p class="small"><A href={`/clubs/${t().clubId}`}>← {t().clubName}</A></p>
          <h1>
            {t().name} <span class={`badge state-${t().state}`}>{t().state}</span>
          </h1>
          <Show when={t().state === 'draft'}>
            <Show when={t().canManage} fallback={<p class="muted">This tournament has not started yet.</p>}>
              <DraftSetup view={t()} refetch={refetch} />
            </Show>
          </Show>
          <Show when={t().state === 'running'}>
            <MyTables view={t()} refetch={refetch} />
            <Show when={t().canManage}>
              <Progress view={t()} refetch={refetch} />
            </Show>
            <Schedule view={t()} />
          </Show>
          <Show when={t().state === 'finished'}>
            <Results view={t()} />
          </Show>
        </section>
      )}
    </Show>
  )
}

type Props = { view: TournamentView; refetch: () => unknown }

function pairLabel(view: TournamentView, pairId: number) {
  const pair = view.pairs.find((p) => p.id === pairId)
  return pair ? `Pair ${pair.number} (${pair.players.map((p) => p.name).join(' & ')})` : '?'
}

function pairNumber(view: TournamentView, pairId: number) {
  return view.pairs.find((p) => p.id === pairId)?.number ?? '?'
}

// Turns "1-3, 7" into [1, 2, 3, 7].
function parseBoards(text: string): number[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const [from, to = from] = part.split('-').map((n) => Number(n.trim()))
      return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
    })
}

function formatBoards(boards: number[]) {
  const sorted = [...boards].sort((a, b) => a - b)
  return sorted[sorted.length - 1] - sorted[0] === sorted.length - 1 && sorted.length > 1
    ? `${sorted[0]}–${sorted[sorted.length - 1]}`
    : sorted.join(', ')
}

function DraftSetup(props: Props) {
  const tournamentId = () => String(props.view.id)
  const action = createAction()
  const run = async (fn: () => Promise<unknown>) => {
    if (await action.run(fn)) props.refetch()
    return !action.error()
  }

  const [player1, setPlayer1] = createSignal('')
  const [player2, setPlayer2] = createSignal('')
  const freeMembers = () => {
    const taken = new Set(props.view.pairs.flatMap((p) => p.players.map((pl) => pl.id)))
    return props.view.members.filter((m) => !taken.has(m.id))
  }
  async function addPair(e: SubmitEvent) {
    e.preventDefault()
    const ok = await run(() =>
      call(
        api.tournaments[':tournamentId'].pairs.$post({
          param: { tournamentId: tournamentId() },
          json: { player1Id: Number(player1()), player2Id: Number(player2()) },
        }),
      ),
    )
    if (ok) {
      setPlayer1('')
      setPlayer2('')
    }
  }

  const [round, setRound] = createSignal('1')
  const [table, setTable] = createSignal('1')
  const [nsPair, setNsPair] = createSignal('')
  const [ewPair, setEwPair] = createSignal('')
  const [boards, setBoards] = createSignal('')
  async function addSitting(e: SubmitEvent) {
    e.preventDefault()
    const ok = await run(() =>
      call(
        api.tournaments[':tournamentId'].sittings.$post({
          param: { tournamentId: tournamentId() },
          json: {
            round: Number(round()),
            tableNumber: Number(table()),
            nsPairId: Number(nsPair()),
            ewPairId: Number(ewPair()),
            boards: parseBoards(boards()),
          },
        }),
      ),
    )
    if (ok) {
      // Most schedules are filled in table by table, so move on to the next table.
      setTable(String(Number(table()) + 1))
      setNsPair('')
      setEwPair('')
      setBoards('')
    }
  }

  return (
    <>
      <Show when={action.error()}>{(error) => <p class="error">{error()}</p>}</Show>

      <h2>Pairs</h2>
      <ul class="list">
        <For each={props.view.pairs} fallback={<li class="muted">No pairs yet.</li>}>
          {(pair) => (
            <li>
              <span>{pairLabel(props.view, pair.id)}</span>
              <button
                class="link danger"
                onClick={() =>
                  run(() =>
                    call(
                      api.tournaments[':tournamentId'].pairs[':pairId'].$delete({
                        param: { tournamentId: tournamentId(), pairId: String(pair.id) },
                      }),
                    ),
                  )
                }
              >
                Remove
              </button>
            </li>
          )}
        </For>
      </ul>
      <form onSubmit={addPair} class="card">
        <h3>Add pair</h3>
        <For each={[[player1, setPlayer1], [player2, setPlayer2]] as const}>
          {([value, setValue]) => (
            <select value={value()} onChange={(e) => setValue(e.currentTarget.value)} required>
              <option value="">Choose a player</option>
              <For each={freeMembers()}>{(m) => <option value={m.id}>{m.name}</option>}</For>
            </select>
          )}
        </For>
        <button type="submit" disabled={action.busy()}>Add pair</button>
      </form>

      <h2>Schedule</h2>
      <ScheduleTable view={props.view} onRemove={(sittingId) =>
        run(() =>
          call(
            api.tournaments[':tournamentId'].sittings[':sittingId'].$delete({
              param: { tournamentId: tournamentId(), sittingId: String(sittingId) },
            }),
          ),
        )
      } />
      <form onSubmit={addSitting} class="card">
        <h3>Add table</h3>
        <div class="row">
          <label>Round <input type="number" min="1" value={round()} onInput={(e) => setRound(e.currentTarget.value)} required /></label>
          <label>Table <input type="number" min="1" value={table()} onInput={(e) => setTable(e.currentTarget.value)} required /></label>
        </div>
        <For each={[['NS', nsPair, setNsPair], ['EW', ewPair, setEwPair]] as const}>
          {([direction, value, setValue]) => (
            <select value={value()} onChange={(e) => setValue(e.currentTarget.value)} required>
              <option value="">{direction} pair</option>
              <For each={props.view.pairs}>{(p) => <option value={p.id}>{direction}: {pairLabel(props.view, p.id)}</option>}</For>
            </select>
          )}
        </For>
        <input
          placeholder={`Boards, e.g. 1-3 (1 to ${props.view.boardCount})`}
          value={boards()}
          onInput={(e) => setBoards(e.currentTarget.value)}
          required
        />
        <button type="submit" disabled={action.busy()}>Add table</button>
      </form>

      <button
        class="primary wide"
        disabled={action.busy() || props.view.sittings.length === 0}
        onClick={() =>
          run(() => call(api.tournaments[':tournamentId'].start.$post({ param: { tournamentId: tournamentId() } })))
        }
      >
        Start tournament
      </button>
    </>
  )
}

function ScheduleTable(props: { view: TournamentView; onRemove?: (sittingId: number) => void }) {
  return (
    <Show when={props.view.sittings.length > 0} fallback={<p class="muted">No tables yet.</p>}>
      <table>
        <thead>
          <tr><th>Round</th><th>Table</th><th>NS</th><th>EW</th><th>Boards</th><Show when={props.onRemove}><th /></Show></tr>
        </thead>
        <tbody>
          <For each={props.view.sittings}>
            {(s) => (
              <tr classList={{ mine: s.nsPairId === props.view.myPairId || s.ewPairId === props.view.myPairId }}>
                <td>{s.round}</td>
                <td>{s.tableNumber}</td>
                <td>{pairNumber(props.view, s.nsPairId)}</td>
                <td>{pairNumber(props.view, s.ewPairId)}</td>
                <td>{formatBoards(s.boards)}</td>
                <Show when={props.onRemove}>
                  {(onRemove) => (
                    <td><button class="link danger" onClick={() => onRemove()(s.id)}>Remove</button></td>
                  )}
                </Show>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </Show>
  )
}

function MyTables(props: Props) {
  const mine = () => props.view.sittings.filter((s) => s.canEnterScores)
  return (
    <Show when={props.view.myPairId !== null}>
      <h2>Your tables</h2>
      <p class="muted small">Enter the NS score of each board, e.g. 420 or -100.</p>
      <For each={mine()}>{(s) => <ScoreCard view={props.view} sitting={s} refetch={props.refetch} />}</For>
    </Show>
  )
}

function ScoreCard(props: Props & { sitting: Sitting }) {
  const action = createAction()

  async function save(board: number, input: HTMLInputElement) {
    const text = input.value.trim()
    const nsScore = text === '' ? null : Number(text)
    const ok = await action.run(() =>
      call(
        api.sittings[':sittingId'].scores[':board'].$put({
          param: { sittingId: String(props.sitting.id), board: String(board) },
          json: { nsScore },
        }),
      ),
    )
    if (ok) props.refetch()
  }

  return (
    <div class="card">
      <h3>Round {props.sitting.round} · Table {props.sitting.tableNumber}</h3>
      <p class="small">
        NS: {pairLabel(props.view, props.sitting.nsPairId)}<br />
        EW: {pairLabel(props.view, props.sitting.ewPairId)}
      </p>
      <For each={props.sitting.results}>
        {(r) => (
          <label class="score">
            <span>Board {r.board}</span>
            <input
              type="number"
              step="10"
              inputmode="numeric"
              placeholder="NS score"
              value={r.nsScore ?? ''}
              onChange={(e) => save(r.board, e.currentTarget)}
            />
            <span class="check">{r.entered ? '✓' : ''}</span>
          </label>
        )}
      </For>
      <Show when={action.error()}>{(error) => <p class="error">{error()}</p>}</Show>
    </div>
  )
}

function Progress(props: Props) {
  const action = createAction()
  const all = () => props.view.sittings.flatMap((s) => s.results)
  const entered = () => all().filter((r) => r.entered).length

  return (
    <div class="card">
      <h2>Progress</h2>
      <p>{entered()} of {all().length} scores entered.</p>
      <button
        class="primary"
        disabled={action.busy()}
        onClick={async () => {
          const ok = await action.run(() =>
            call(api.tournaments[':tournamentId'].close.$post({ param: { tournamentId: String(props.view.id) } })),
          )
          if (ok) props.refetch()
        }}
      >
        Close tournament
      </button>
      <Show when={action.error()}>{(error) => <p class="error">{error()}</p>}</Show>
    </div>
  )
}

function Schedule(props: { view: TournamentView }) {
  return (
    <>
      <h2>Schedule</h2>
      <ScheduleTable view={props.view} />
    </>
  )
}

function Results(props: { view: TournamentView }) {
  const boards = () =>
    [...new Set(props.view.sittings.flatMap((s) => s.boards))]
      .sort((a, b) => a - b)
      .map((board) => ({
        board,
        rows: props.view.sittings
          .filter((s) => s.boards.includes(board))
          .map((s) => ({ sitting: s, result: s.results.find((r) => r.board === board)! })),
      }))

  return (
    <Show
      when={props.view.ranking}
      fallback={<p class="muted">The results are visible to the players who took part.</p>}
    >
      {(ranking) => (
        <>
          <h2>Ranking</h2>
          <table>
            <thead><tr><th>#</th><th>Pair</th><th>MP</th><th>%</th></tr></thead>
            <tbody>
              <For each={ranking()}>
                {(r) => (
                  <tr classList={{ mine: r.pairId === props.view.myPairId }}>
                    <td>{r.rank}</td>
                    <td>{pairLabel(props.view, r.pairId)}</td>
                    <td>{r.matchpoints}/{r.max}</td>
                    <td>{r.percentage === null ? '–' : r.percentage.toFixed(1)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          <h2>Boards</h2>
          <For each={boards()}>
            {(b) => (
              <div class="card">
                <h3>Board {b.board}</h3>
                <table>
                  <thead><tr><th>NS</th><th>EW</th><th>Score</th><th>MP NS</th><th>MP EW</th></tr></thead>
                  <tbody>
                    <For each={b.rows}>
                      {({ sitting, result }) => (
                        <tr>
                          <td>{pairNumber(props.view, sitting.nsPairId)}</td>
                          <td>{pairNumber(props.view, sitting.ewPairId)}</td>
                          <td>{result.nsScore ?? '–'}</td>
                          <td>{result.nsMatchpoints ?? '–'}</td>
                          <td>{result.ewMatchpoints ?? '–'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            )}
          </For>
        </>
      )}
    </Show>
  )
}
