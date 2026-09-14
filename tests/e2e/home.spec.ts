import { expect, test } from "@playwright/test";

test("renders the landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /next\.js template with tracing, metrics, and drizzle/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /primary/i }).getByRole("link", {
      name: /^guide$/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("src/features", { exact: true })).toBeVisible();
  await expect(page.getByText(/observability is part of the template/i)).toBeVisible();
});

test("renders the guide page", async ({ page }) => {
  await page.goto("/guide");

  await expect(
    page.getByRole("heading", {
      name: /use the project confidently once the app is live/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText("/api/subscribers", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/daily workflow/i)).toBeVisible();
});

test("renders the operations page", async ({ page }) => {
  await page.goto("/operations");

  await expect(
    page.getByRole("heading", {
      name: /operate the live system with health, metrics, logs, and traces/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("OTEL_TRACE_IGNORE_PATHS")).toBeVisible();
  await expect(page.getByText(/tempo and grafana workflow/i)).toBeVisible();
});

test("creates a subscriber from the landing page", async ({ page }) => {
  const email = `qa-${Date.now()}@example.com`;

  await page.goto("/");
  await page.getByLabel("Name").fill("Jane Example");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /join the list/i }).click();

  await expect(
    page.getByText("Subscriber saved in the local database.", { exact: true }),
  ).toBeVisible();
});

test("returns a health payload", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);

  const payload = (await response.json()) as {
    appName: string;
    checkedAt: string;
    database: "file" | "remote";
    status: "ok";
    tracing: {
      enabled: boolean;
      serviceName: string;
    };
  };

  expect(payload.status).toBe("ok");
  expect(payload.appName).toBe("Next.js Drizzle Template");
});

test("exposes Prometheus metrics", async ({ request }) => {
  const response = await request.get("/metrics");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("nextjs_drizzle_http_requests_total");
});
