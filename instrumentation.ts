export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { registerTelemetry } = await import("./src/server/observability/register");

  await registerTelemetry();
}
