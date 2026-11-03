import { createResource, createRoot, createSignal } from 'solid-js'
import { DetailedError, hc, type InferResponseType, parseResponse } from 'hono/client'
import type { AppType } from '../server/app.ts'

export const api = hc<AppType>(window.location.origin).api

// Resolves to the response body, or throws when the response is not OK.
export const call = parseResponse

export type TournamentView = InferResponseType<(typeof api.tournaments)[':tournamentId']['$get'], 200>

export function errorMessage(e: unknown): string {
  if (e instanceof DetailedError) return e.detail?.data?.error ?? e.message
  return e instanceof Error ? e.message : String(e)
}

// The logged in user, shared by all pages.
export const [me, { refetch: refetchMe }] = createRoot(() =>
  createResource(() => call(api.auth.me.$get())),
)

// Runs a request, keeping track of whether it is busy and of its error message.
export function createAction() {
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}
