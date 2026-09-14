import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/server/env";
import { observeRoute } from "@/server/http/observed-route";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  appName: z.string().trim().min(1),
  database: z.enum(["file", "remote"]),
  checkedAt: z.string().trim().min(1),
  tracing: z.object({
    enabled: z.boolean(),
    serviceName: z.string().trim().min(1),
  }),
});

export const runtime = "nodejs";

export const GET = observeRoute(
  {
    method: "GET",
    route: "/api/health",
  },
  async function GET() {
    const payload = healthResponseSchema.parse({
      status: "ok",
      appName: env.APP_NAME,
      checkedAt: new Date().toISOString(),
      database: env.DATABASE_URL.startsWith("file:") ? "file" : "remote",
      tracing: {
        enabled: env.OTEL_TRACING_ENABLED,
        serviceName: env.OTEL_SERVICE_NAME,
      },
    });

    return NextResponse.json(payload);
  },
);
