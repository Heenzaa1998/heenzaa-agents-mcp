import { expect, test } from "@playwright/test";

test("renders the studio landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /make images and video just by asking/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /primary/i }).getByRole("link", { name: /^gallery$/i }),
  ).toBeVisible();
  await expect(page.getByText("generate_video", { exact: true })).toBeVisible();
});

test("sends visitors without a session to the gallery sign-in page", async ({ page }) => {
  await page.goto("/gallery");

  await expect(page).toHaveURL(/\/gallery\/login$/);
  await expect(page.getByRole("heading", { name: /the gallery is private/i })).toBeVisible();
});

test("returns a health payload", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);

  const payload = (await response.json()) as {
    appName: string;
    status: "ok";
  };

  expect(payload.status).toBe("ok");
});

test("exposes Prometheus metrics", async ({ request }) => {
  const response = await request.get("/metrics");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("nextjs_drizzle_http_requests_total");
});
