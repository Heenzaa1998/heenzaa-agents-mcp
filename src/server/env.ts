import { z } from "zod";

const optionalString = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },
  z.string().trim().min(1).optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }

    if (normalized === "") {
      return undefined;
    }
  }

  return value;
}, z.boolean().optional());

const optionalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (normalized === "") {
      return undefined;
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number().finite().optional());

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) =>
      value.startsWith("file:") ||
      value.startsWith("libsql:") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    "DATABASE_URL must start with file:, libsql:, http://, or https://",
  );

const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Value must start with http:// or https://",
  );

const envSchema = z.object({
  APP_NAME: z.string().trim().min(1).default("Next.js Drizzle Template"),
  DATABASE_AUTH_TOKEN: optionalString,
  DATABASE_URL: databaseUrlSchema.default("file:local.db"),
  KIE_API_KEY: optionalString,
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  MCP_AUTH_TOKEN: optionalString,
  METRICS_PREFIX: z.string().trim().default("nextjs_drizzle_"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OTEL_EXPORTER_OTLP_ENDPOINT: httpUrlSchema.default("http://127.0.0.1:4318"),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalString,
  OTEL_SERVICE_NAME: z.string().trim().min(1).default("nextjs-drizzle"),
  OTEL_SERVICE_VERSION: z.string().trim().min(1).default("0.1.0"),
  OTEL_TRACE_IGNORE_PATHS: z
    .string()
    .trim()
    .default("/_next/*,/favicon.ico,/metrics"),
  OTEL_TRACE_SAMPLE_RATIO: optionalNumber.pipe(
    z.number().min(0).max(1).default(1),
  ),
  OTEL_TRACING_ENABLED: optionalBoolean.pipe(z.boolean().default(false)),
});

export function createEnv(source: NodeJS.ProcessEnv = process.env) {
  return envSchema.parse({
    APP_NAME: source.APP_NAME,
    DATABASE_AUTH_TOKEN: source.DATABASE_AUTH_TOKEN,
    DATABASE_URL: source.DATABASE_URL,
    KIE_API_KEY: source.KIE_API_KEY,
    LOG_LEVEL: source.LOG_LEVEL,
    MCP_AUTH_TOKEN: source.MCP_AUTH_TOKEN,
    METRICS_PREFIX: source.METRICS_PREFIX,
    NODE_ENV: source.NODE_ENV,
    OTEL_EXPORTER_OTLP_ENDPOINT: source.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: source.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    OTEL_SERVICE_NAME: source.OTEL_SERVICE_NAME,
    OTEL_SERVICE_VERSION: source.OTEL_SERVICE_VERSION,
    OTEL_TRACE_IGNORE_PATHS: source.OTEL_TRACE_IGNORE_PATHS,
    OTEL_TRACE_SAMPLE_RATIO: source.OTEL_TRACE_SAMPLE_RATIO,
    OTEL_TRACING_ENABLED: source.OTEL_TRACING_ENABLED,
  });
}

export const env = createEnv();
