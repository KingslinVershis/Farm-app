import { Pool } from "pg";
import type { PoolConfig } from "pg";

// Detect deployed environment (Vercel serverless / AWS Lambda / production)
export const isDeployed = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production"
);

/**
 * Resolves the appropriate database connection string:
 * - In Development (dev mode): Uses local Postgres DB data (LOCAL_DATABASE_URL or localhost DATABASE_URL).
 * - In Deployed mode (Vercel): Uses Neon Postgres DB data (NEON_DATABASE_URL or cloud DATABASE_URL).
 */
export function resolveDatabaseUrl(): string | undefined {
    // 1. Explicit override if developer wants to test Neon in dev or local in prod
    if (process.env.FORCE_DB_TARGET === "neon" || process.env.USE_NEON_IN_DEV === "true") {
        return (
            process.env.NEON_DATABASE_URL ||
            process.env.POSTGRES_URL ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL
        );
    }
    if (process.env.FORCE_DB_TARGET === "local") {
        return (
            process.env.LOCAL_DATABASE_URL ||
            process.env.DATABASE_URL ||
            "postgresql://postgres:password@localhost:5432/Farm_DB"
        );
    }

    // 2. Deployed site (e.g. Vercel deployment) -> take data from Neon Postgres
    if (isDeployed) {
        return (
            process.env.NEON_DATABASE_URL ||
            process.env.POSTGRES_URL ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL
        );
    }

    // 3. Dev mode -> take data from local Postgres DB
    if (process.env.LOCAL_DATABASE_URL) {
        return process.env.LOCAL_DATABASE_URL;
    }

    const devUrl = process.env.DATABASE_URL;
    if (devUrl) {
        const lower = devUrl.toLowerCase();
        if (
            lower.includes("localhost") ||
            lower.includes("127.0.0.1") ||
            lower.includes("0.0.0.0") ||
            lower.includes("::1")
        ) {
            return devUrl;
        }
    }

    // Default local postgres instance
    return devUrl || "postgresql://postgres:password@localhost:5432/Farm_DB";
}

export function getSslConfig(url?: string): PoolConfig["ssl"] {
    if (!url) return undefined;

    // 1. Explicit override via env variable
    if (process.env.DATABASE_SSL === "true") {
        return { rejectUnauthorized: false };
    }
    if (process.env.DATABASE_SSL === "false") {
        return false;
    }

    const lower = url.toLowerCase();

    // 2. Explicit sslmode in connection string
    if (lower.includes("sslmode=disable")) {
        return false;
    }
    if (lower.includes("sslmode=require") || lower.includes("sslmode=prefer")) {
        return { rejectUnauthorized: false };
    }

    // 3. Localhost or private loopback addresses: SSL is not supported/required
    if (
        lower.includes("localhost") ||
        lower.includes("127.0.0.1") ||
        lower.includes("0.0.0.0") ||
        lower.includes("::1")
    ) {
        return false;
    }

    // 4. Remote cloud Postgres (Neon, Vercel, Supabase, Render, AWS, etc.)
    return { rejectUnauthorized: false };
}

const connectionString = resolveDatabaseUrl();
const sslConfig = getSslConfig(connectionString);

const globalForPostgres = globalThis as typeof globalThis & {
    postgresPool?: Pool;
    postgresPoolUrl?: string;
    postgresPoolSsl?: PoolConfig["ssl"];
};

const shouldReusePool = Boolean(
    globalForPostgres.postgresPool &&
    globalForPostgres.postgresPoolUrl === connectionString &&
    JSON.stringify(globalForPostgres.postgresPoolSsl) === JSON.stringify(sslConfig)
);

export const pool: Pool = shouldReusePool
    ? globalForPostgres.postgresPool!
    : (connectionString
        ? new Pool({
            connectionString,
            ...(sslConfig !== undefined ? { ssl: sslConfig } : {}),
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
    globalForPostgres.postgresPoolUrl = connectionString;
    globalForPostgres.postgresPoolSsl = sslConfig;
}
