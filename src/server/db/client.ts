import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/server/env";
import * as schema from "@/server/db/schema";

// Neon's HTTP driver: each query is a stateless HTTPS request, so there is no
// connection pool to manage on serverless. It only talks to Neon.
function createDatabase() {
  return drizzle({
    client: neon(env.DATABASE_URL),
    schema,
  });
}

const globalForDb = globalThis as typeof globalThis & {
  __db?: ReturnType<typeof createDatabase>;
};

export const db = globalForDb.__db ?? createDatabase();

if (env.NODE_ENV !== "production") {
  globalForDb.__db = db;
}
