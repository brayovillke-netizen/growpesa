import postgres from 'postgres';

const url = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

let client: ReturnType<typeof postgres>;

if (url) {
  client = globalForDb.sql ?? postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  if (process.env.NODE_ENV !== 'production') globalForDb.sql = client;
} else {
  // During build, return a dummy function that throws only if called.
  // This prevents Next.js from trying to connect during the build.
  client = new Proxy({} as any, {
    get: () => {
      throw new Error('DATABASE_URL is not set. This should only happen during build.');
    },
  });
}

export const sql = client;