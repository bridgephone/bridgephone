# Bridgephone

A mobile-first webapp for bridge pairs tournaments at a bridge club. See [SPEC.md](SPEC.md) for what it does.

## What you need

- **Node.js 24** or later (the server runs its TypeScript directly, without a build step)
- **Docker** with Docker Compose (for Postgres, and for running the whole app)

On Nix, `nix develop` gives you Node, docker-compose and `psql`; Docker itself must still run on the host. Everyone else installs Node and Docker the usual way. Nothing in the project depends on Nix.

## Run it in development

```sh
cp .env.example .env    # then set SITE_ADMINS to your email address
npm install
docker compose up -d db # or: nix run .#db
npm run dev
```

Open http://localhost:5173. Vite serves the frontend with hot reload and passes `/api` to the API server on port 3000, which restarts when its files change. The database tables are created when the API starts.

With `DEV_LOGIN=true` (the default in `.env.example`) the login page lets you log in with just an email address. That address must belong to a site admin or a club member. To use Google sign-in, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with the redirect URI `http://localhost:5173/api/auth/google/callback`.

A good way to start: log in as the site admin, create a club, then add yourself and a few others to it.

## Run it like production

```sh
docker compose up --build   # or: nix run .#up
```

This builds one container, which serves both the frontend and the API on http://localhost:3000, and starts it next to Postgres. Stop everything with `docker compose down` (or `nix run .#down`).

In production, set these environment variables on the container: `DATABASE_URL`, `APP_URL` (the public `https://` address), `SITE_ADMINS`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Leave `DEV_LOGIN` unset.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and frontend with reloading |
| `npm test` | Unit tests (scoring) |
| `npm run typecheck` | Type-check server and frontend together |
| `npm run build` | Build the frontend into `dist/web` |
| `npm start` | Run the server (serves `dist/web` too) |

The API is described at `/api/docs` (Swagger UI) and `/api/openapi.json`.

## Layout

```
src/shared/   scoring (matchpoints and ranking), used by the server
src/server/   Hono API: auth, access rules, routes
src/web/      SolidJS frontend; talks to the API through Hono's typed client
migrations/   SQL files, applied in order when the server starts
```

To change the database, add a new numbered file to `migrations/`. Don't edit a file that has already been applied.
