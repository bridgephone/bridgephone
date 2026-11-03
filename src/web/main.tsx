import { render } from 'solid-js/web'
import { Navigate, Route, Router, useLocation, useNavigate } from '@solidjs/router'
import { type ParentProps, Show } from 'solid-js'
import { api, call, me, refetchMe } from './api.ts'
import { Login } from './pages/Login.tsx'
import { Home } from './pages/Home.tsx'
import { Club } from './pages/Club.tsx'
import { Tournament } from './pages/Tournament.tsx'
import './styles.css'

function Layout(props: ParentProps) {
  const location = useLocation()
  const navigate = useNavigate()

  async function logout() {
    await call(api.auth.logout.$post())
    await refetchMe()
    navigate('/login')
  }

  return (
    <Show when={me()}>
      {(session) => (
        <Show
          when={session().user || location.pathname === '/login'}
          fallback={<Navigate href="/login" />}
        >
          <header>
            <a href="/" class="brand">Bridgephone</a>
            <Show when={session().user}>
              {(user) => (
                <span class="user">
                  {user().name ?? user().email}
                  <button class="link" onClick={logout}>Log out</button>
                </span>
              )}
            </Show>
          </header>
          <main>{props.children}</main>
        </Show>
      )}
    </Show>
  )
}

render(
  () => (
    <Router root={Layout}>
      <Route path="/login" component={Login} />
      <Route path="/" component={Home} />
      <Route path="/clubs/:clubId" component={Club} />
      <Route path="/tournaments/:tournamentId" component={Tournament} />
      <Route path="*" component={() => <p>Page not found.</p>} />
    </Router>
  ),
  document.getElementById('app')!,
)
