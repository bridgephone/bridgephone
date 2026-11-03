import { useNavigate, useSearchParams } from '@solidjs/router'
import { createSignal, Show } from 'solid-js'
import { api, call, createAction, me, refetchMe } from '../api.ts'

const loginErrors: Record<string, string> = {
  'not-a-member': 'This Google account is not a member of any club. Ask your club manager to add your email address.',
  failed: 'Logging in with Google failed. Please try again.',
}

export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const action = createAction()

  async function devLogin(e: SubmitEvent) {
    e.preventDefault()
    const ok = await action.run(() => call(api.auth['dev-login'].$post({ json: { email: email() } })))
    if (ok) {
      await refetchMe()
      navigate('/')
    }
  }

  return (
    <section class="login">
      <h1>Log in</h1>
      <Show when={typeof params.error === 'string' && params.error}>
        {(code) => <p class="error">{loginErrors[code()] ?? loginErrors.failed}</p>}
      </Show>
      <Show
        when={me()?.googleLogin}
        fallback={<p class="muted">Google sign-in is not configured on this server.</p>}
      >
        <a class="button primary" href="/api/auth/google">Log in with Google</a>
      </Show>
      <Show when={me()?.devLogin}>
        <form onSubmit={devLogin} class="card">
          <p class="muted">Development login: log in as any member by email address.</p>
          <input
            type="email"
            placeholder="email@example.com"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <button type="submit" disabled={action.busy()}>Log in</button>
          <Show when={action.error()}>{(error) => <p class="error">{error()}</p>}</Show>
        </form>
      </Show>
    </section>
  )
}
