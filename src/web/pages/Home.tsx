import { A } from '@solidjs/router'
import { createResource, createSignal, For, Show } from 'solid-js'
import { api, call, createAction, me } from '../api.ts'

export function Home() {
  const [clubs, { refetch }] = createResource(() => call(api.clubs.$get()))
  const [name, setName] = createSignal('')
  const action = createAction()

  async function createClub(e: SubmitEvent) {
    e.preventDefault()
    if (await action.run(() => call(api.clubs.$post({ json: { name: name() } })))) {
      setName('')
      refetch()
    }
  }

  return (
    <section>
      <h1>Clubs</h1>
      <Show when={clubs.latest}>
        {(list) => (
          <Show when={list().length > 0} fallback={<p class="muted">You are not a member of a club yet.</p>}>
            <ul class="list">
              <For each={list()}>
                {(club) => (
                  <li>
                    <A href={`/clubs/${club.id}`}>{club.name}</A>
                    <Show when={club.role === 'manager'}><span class="badge">manager</span></Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        )}
      </Show>

      <Show when={me()?.user?.isSiteAdmin}>
        <form onSubmit={createClub} class="card">
          <h2>New club</h2>
          <input placeholder="Club name" value={name()} onInput={(e) => setName(e.currentTarget.value)} required />
          <button type="submit" disabled={action.busy()}>Create club</button>
          <Show when={action.error()}>{(error) => <p class="error">{error()}</p>}</Show>
        </form>
      </Show>
    </section>
  )
}
