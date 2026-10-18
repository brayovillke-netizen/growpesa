import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }

const sql = postgres(url, { max: 1, prepare: false });

await sql`
  create table if not exists _migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`;

const dir = 'db/migrations';
const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();

const applied = new Set(
  (await sql`select name from _migrations`).map(r => r.name)
);

for (const file of files) {
  if (applied.has(file)) { console.log('skip', file); continue; }
  const text = await readFile(join(dir, file), 'utf8');
  console.log('apply', file);
  await sql.unsafe(text);
  await sql`insert into _migrations (name) values (${file})`;
}

console.log('done');
await sql.end();