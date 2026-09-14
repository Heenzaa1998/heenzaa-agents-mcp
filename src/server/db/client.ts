import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "@/server/env";
import * as schema from "@/server/db/schema";

function createDatabase() {
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });

  return drizzle({
    client,
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
