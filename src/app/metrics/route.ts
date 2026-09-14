import { metricsStore, renderMetrics } from "@/server/observability/metrics";
import { observeRoute } from "@/server/http/observed-route";

export const runtime = "nodejs";

export const GET = observeRoute(
  {
    method: "GET",
    route: "/metrics",
  },
  async function GET() {
    const body = await renderMetrics();

    return new Response(body, {
      headers: {
        "Content-Type": metricsStore.registry.contentType,
      },
      status: 200,
    });
  },
);
