import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { env } from './env.ts'

export const sql = postgres(env.databaseUrl, { transform: postgres.camel, onnotice: () => {} })

const migrationsDir = new URL('../../migrations/', import.meta.url)

// Applies the .sql files in /migrations that have not been applied yet, in name order.
export async function migrate() {
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `
  const applied = new Set(
    (await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name),
  )
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (applied.has(file)) continue
    const text = await readFile(new URL(file, migrationsDir), 'utf8')
    await sql.begin(async (tx) => {
      await tx.unsafe(text)
      await tx.unsafe('insert into schema_migrations (name) values ($1)', [file])
    })
    console.log(`Applied migration ${file}`)
  }
}
