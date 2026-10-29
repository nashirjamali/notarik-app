import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { stubGoogle } from "./google-stub";

const API = "http://127.0.0.1:8000";

test.beforeEach(async ({ context }) => stubGoogle(context));

async function user(request: import("@playwright/test").APIRequestContext) {
  const email = `a11y-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const res = await request.post(`${API}/auth/signup`, { data: { email, password: "password123", name: "Rina" } });
  const { access_token } = await res.json();
  const date = new Date();
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  await request.post(`${API}/transactions`, {
    headers: { authorization: `Bearer ${access_token}` },
    data: { merchant: "Warung Tegal", date: iso, total_minor: 25_000, currency: "IDR", category: "Dining", items: [] },
  });
  return email;
}

async function violations(page: import("@playwright/test").Page) {
  // Mid-animation colours (fade-ins) would be measured as low contrast; check the settled page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

test("public pages have no detectable accessibility violations", async ({ page }) => {
  for (const path of ["/", "/login", "/signup"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations(page), path).toEqual([]);
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`app pages have no detectable accessibility violations at ${viewport.width}px`, async ({ browser, request }) => {
    const context = await browser.newContext({ viewport });
    await stubGoogle(context);
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email").fill(await user(request));
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/app");
    for (const path of ["/app", "/app/transactions", "/app/recap", "/app/ask", "/app/settings", "/app/receipts/new"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await violations(page), `${path} at ${viewport.width}px`).toEqual([]);
    }
    await context.close();
  });
}
