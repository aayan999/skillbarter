// Database access layer.
// Production: PostgreSQL via DATABASE_URL (pg Pool).
// Local demo / tests: embedded PostgreSQL (PGlite) so the app runs with zero setup.
// Schema lives in db/migrations/*.sql and is applied idempotently on first use.

import { Pool, PoolClient } from "pg";
import fs from "node:fs";
import path from "node:path";

export type QueryFn = (text: string, params?: unknown[]) => Promise<any[]>;

let pool: Pool | null = null;
let pglite: { query: Function; exec: Function; transaction: Function } | null = null;
let migrated: Promise<void> | null = null;

function migrationSql(): string {
  const dir = path.join(process.cwd(), "db", "migrations");
  return fs
    .readdirSync(dir)
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
}

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function getPglite() {
  if (!pglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    pglite = new PGlite(process.env.PGLITE_DATA_DIR || "./.pglite-data");
  }
  return pglite!;
}

async function ensureMigrated(): Promise<void> {
  if (!migrated) {
    migrated = (async () => {
      const sql = migrationSql();
      if (process.env.DATABASE_URL) {
        await getPool().query(sql);
      } else {
        await (await getPglite()).exec(sql);
      }
    })();
  }
  return migrated;
}

export async function query(text: string, params: unknown[] = []): Promise<any[]> {
  await ensureMigrated();
  if (process.env.DATABASE_URL) {
    const res = await getPool().query(text, params as any[]);
    return res.rows;
  }
  const res: any = await (await getPglite()).query(text, params);
  return res.rows;
}

// Runs fn inside a real transaction; fn receives a scoped query function.
export async function withTx<T>(fn: (q: QueryFn) => Promise<T>): Promise<T> {
  await ensureMigrated();
  if (process.env.DATABASE_URL) {
    const client: PoolClient = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(async (t, p = []) => (await client.query(t, p as any[])).rows);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  const pg = await getPglite();
  return (await pg.transaction(async (tx: any) =>
    fn(async (t, p = []) => (await tx.query(t, p)).rows)
  )) as T;
}
