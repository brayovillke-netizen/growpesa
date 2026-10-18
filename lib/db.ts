import postgres from 'postgres';

const url = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

// Use a fallback URL for the build phase so Vercel doesn't crash.
// The real DATABASE_URL will be used when the app is running.
export const sql =
  globalForDb.sql ??
  postgres(url || 'postgres://postgres:postgres@localhost:5432/postgres', {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql;