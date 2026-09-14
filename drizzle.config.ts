import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { createEnv } from "./src/server/env";

loadEnvConfig(process.cwd());

const env = createEnv(process.env);

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
