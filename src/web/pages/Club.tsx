import { A, useNavigate, useParams } from '@solidjs/router'
import { createResource, createSignal, For, Show } from 'solid-js'
import { api, call, createAction, me } from '../api.ts'

export function Club() {
  const params = useParams<{ clubId: string }>()
  const navigate = useNavigate()
  const [club, { refetch }] = createResource(
    () => params.clubId,
    (clubId) => call(api.clubs[':clubId'].$get({ param: { clubId } })),
  )
  const isSiteAdmin = () => me()?.user?.isSiteAdmin ?? false

  const [tournamentName, setTournamentName] = createSignal('')
  const tournamentAction = createAction()
  async function createTournament(e: SubmitEvent) {
    e.preventDefault()
    let id = 0
    const ok = await tournamentAction.run(async () => {
      const res = await call(
        api.clubs[':clubId'].tournaments.$post({
          param: { clubId: params.clubId },
          json: { name: tournamentName() },
        }),
      )
      id = res.id
    })
    if (ok) navigate(`/tournaments/${id}`)
  }

  const [email, setEmail] = createSignal('')
  const [name, setName] = createSignal('')
  const [role, setRole] = createSignal<'player' | 'manager'>('player')
  const memberAction = createAction()
  async function addMember(e: SubmitEvent) {
    e.preventDefault()
    const ok = await memberAction.run(() =>
      call(
        api.clubs[':clubId'].members.$post({
          param: { clubId: params.clubId },
          json: { email: email(), name: name(), role: role() },
        }),
      ),
    )
    if (ok) {
      setEmail('')
      setName('')
      setRole('player')
      refetch()
    }
  }
  async function removeMember(userId: number) {
    const ok = await memberAction.run(() =>
      call(
        api.clubs[':clubId'].members[':userId'].$delete({
          param: { clubId: params.clubId, userId: String(userId) },
        }),
      ),
    )
    if (ok) refetch()
  }

  return (
    <Show when={club.latest} fallback={<Show when={club.error}><p class="error">Club not found.</p></Show>}>
      {(c) => (
        <section>
          <h1>{c().name}</h1>

          <h2>Tournaments</h2>
          <Show when={c().tournaments.length > 0} fallback={<p class="muted">No tournaments yet.</p>}>
            <ul class="list">
              <For each={c().tournaments}>
                {(t) => (
                  <li>
                    <A href={`/tournaments/${t.id}`}>{t.name}</A>
                    <span class={`badge state-${t.state}`}>{t.state}</span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={c().canManage}>
            <form onSubmit={createTournament} class="card">
              <h3>New tournament</h3>
              <input
                placeholder="Tournament name"
                value={tournamentName()}
                onInput={(e) => setTournamentName(e.currentTarget.value)}
                required
              />
              <button type="submit" disabled={tournamentAction.busy()}>Create tournament</button>
              <Show when={tournamentAction.error()}>{(error) => <p class="error">{error()}</p>}</Show>
            </form>
          </Show>

          <h2>Members</h2>
          <ul class="list">
            <For each={c().members}>
              {(m) => (
                <li>
                  <span>
                    {m.name ?? m.email}
                    <Show when={m.name}><span class="muted small"> {m.email}</span></Show>
                  </span>
                  <span class="row">
                    <Show when={m.role === 'manager'}><span class="badge">manager</span></Show>
                    <Show when={c().canManage && (m.role === 'player' || isSiteAdmin())}>
                      <button class="link danger" onClick={() => removeMember(m.id)}>Remove</button>
                    </Show>
                  </span>
                </li>
              )}
            </For>
          </ul>
          <Show when={c().canManage}>
            <form onSubmit={addMember} class="card">
              <h3>Add member</h3>
              <input type="email" placeholder="Email address" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} required />
              <input placeholder="Name (optional)" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
              <Show when={isSiteAdmin()}>
                <select value={role()} onChange={(e) => setRole(e.currentTarget.value as 'player' | 'manager')}>
                  <option value="player">Player</option>
                  <option value="manager">Club manager</option>
                </select>
              </Show>
              <button type="submit" disabled={memberAction.busy()}>Add member</button>
              <Show when={memberAction.error()}>{(error) => <p class="error">{error()}</p>}</Show>
            </form>
          </Show>
        </section>
      )}
    </Show>
  )
}
