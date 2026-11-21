import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const globalForPostgres = globalThis as typeof globalThis & {
    postgresPool?: Pool;
};

export const pool: Pool =
    globalForPostgres.postgresPool ??
    (connectionString
        ? new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
        })
        : ({
            query: async () => ({ rows: [] }),
            on: () => {},
            connect: async () => ({
                query: async () => ({ rows: [] }),
                release: () => {},
            }),
        } as unknown as Pool));

if (process.env.NODE_ENV !== "production") {
    globalForPostgres.postgresPool = pool;
}