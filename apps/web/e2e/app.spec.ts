import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { stubGoogle } from "./google-stub";

const API = "http://127.0.0.1:8000";
const PASSWORD = "password123";

test.beforeEach(async ({ context }) => stubGoogle(context));

/** Creates a user straight on the API and gives them one expense dated today. */
async function seedUser(request: APIRequest, merchant: string) {
  const email = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const signup = await request.post(`${API}/auth/signup`, { data: { email, password: PASSWORD, name: "Rina Putri" } });
  expect(signup.ok()).toBeTruthy();
  const { access_token } = await signup.json();
  const date = new Date();
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const created = await request.post(`${API}/transactions`, {
    headers: { authorization: `Bearer ${access_token}` },
    data: { merchant, date: iso, total_minor: 25_000, currency: "IDR", category: "Dining", payment_method: "Cash", items: [] },
  });
  expect(created.status()).toBe(201);
  return email;
}
type APIRequest = APIRequestContext;

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("a visit to /app without a session redirects to /login", async ({ page }) => {
  await page.goto("/app/transactions");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("wrong password shows an error and stays on the form", async ({ page }) => {
  const email = await seedUser(page.request, "Warung Tegal");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("log in, see the seeded expense, keep tokens out of the page, log out", async ({ page }) => {
  const email = await seedUser(page.request, "Warung Tegal");
  await logIn(page, email);

  await expect(page.getByRole("heading", { level: 2, name: /Rina/ })).toBeVisible();
  await expect(page.getByRole("main").getByText("Warung Tegal")).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
  // Next keeps the previous route (Home) hidden in the DOM, so only look at what is visible.
  const visibleText = (text: string) => page.getByText(text).filter({ visible: true });
  await expect(visibleText("Warung Tegal")).toBeVisible();
  await expect(visibleText("Rp 25.000").first()).toBeVisible();
  await expect(visibleText("Today").first()).toBeVisible();

  // Category filter: another category has nothing, so the empty state shows.
  await page.getByRole("radio", { name: "Bills" }).click();
  await expect(visibleText("No expenses this month")).toBeVisible();
  await page.getByRole("radio", { name: "Food & Drink" }).click();
  await expect(visibleText("Warung Tegal")).toBeVisible();

  // The browser can never read a token.
  const visible = await page.evaluate(() => ({ cookie: document.cookie, local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
  expect(visible.cookie).toBe("");
  expect(visible.local).toBe("{}");
  expect(visible.session).toBe("{}");
  const cookies = await page.context().cookies();
  expect(cookies.filter((c) => c.name.startsWith("nt_")).every((c) => c.httpOnly && c.sameSite === "Lax")).toBeTruthy();
  expect(cookies.map((c) => c.name)).toEqual(expect.arrayContaining(["nt_access", "nt_refresh"]));

  await page.getByRole("button", { name: "Log out" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("a second user never sees the first user's rows", async ({ browser, request }) => {
  const emailA = await seedUser(request, "Toko Rahasia A");
  const emailB = await seedUser(request, "Kedai B");

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await logIn(pageA, emailA);
  await expect(pageA.getByRole("main").getByText("Toko Rahasia A")).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await logIn(pageB, emailB);
  await pageB.goto("/app/transactions");
  await expect(pageB.getByText("Kedai B")).toBeVisible();
  const body = await (await pageB.request.get("/api/proxy/transactions?month=" + new Date().toISOString().slice(0, 7))).text();
  expect(body).toContain("Kedai B");
  expect(body).not.toContain("Toko Rahasia A");
  await expect(pageB.getByText("Toko Rahasia A")).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

test("recap shows the month by category, a projection, and lets you set a budget", async ({ page }) => {
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.getByRole("link", { name: "Recap" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/app\/recap$/);
  // Home stays in the DOM, hidden, after client navigation: only look at what is visible.
  const main = page.getByRole("main");
  const seen = (text: string | RegExp) => main.getByText(text).filter({ visible: true });
  await expect(seen("Rp 25.000").first()).toBeVisible();
  await expect(main.getByText("Food & Drink", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(seen("100%")).toBeVisible();
  await expect(seen(/Estimated total by the end of the month/)).toBeVisible();
  await expect(seen("No budget for this month")).toBeVisible();

  await main.getByRole("button", { name: "Set budget" }).click();
  await main.getByLabel("Monthly budget").fill("abc");
  await main.getByRole("button", { name: "Save" }).click();
  await expect(main.getByRole("alert").filter({ visible: true })).toContainText("Enter an amount");

  await main.getByLabel("Monthly budget").fill("100rb");
  await main.getByRole("button", { name: "Save" }).click();
  await expect(seen("Rp 100.000").first()).toBeVisible();
  await expect(seen(/25% used/)).toBeVisible();
  await expect(main.getByRole("button", { name: "Edit budget" })).toBeVisible();
});

test("add, edit and delete an expense", async ({ page }) => {
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  const visible = (text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).first().click();
  await page.getByRole("link", { name: "Add", exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/transactions\/new$/);

  // Validation first.
  await page.getByLabel("Merchant").filter({ visible: true }).fill("Kopi Tuku");
  await page.getByLabel("Amount").filter({ visible: true }).fill("abc");
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByText("Enter an amount like 25rb or 25.000")).toBeVisible();

  await page.getByLabel("Amount").filter({ visible: true }).fill("32rb");
  await page.locator("select[name=category]").filter({ visible: true }).selectOption("Dining");
  await page.locator("select[name=payment]").filter({ visible: true }).selectOption("QRIS");
  await page.getByLabel("Note").filter({ visible: true }).fill("<i>morning</i> coffee");
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(visible("Kopi Tuku")).toBeVisible();

  // Detail, then edit the amount and category.
  await visible("Kopi Tuku").click();
  await expect(page.getByRole("heading", { name: "Kopi Tuku" })).toBeVisible();
  await expect(visible("Rp 32.000")).toBeVisible();
  await expect(visible("<i>morning</i> coffee")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Amount").filter({ visible: true }).fill("45.000");
  await page.locator("select[name=category]").filter({ visible: true }).selectOption("Shopping");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(visible("Rp 45.000")).toBeVisible();
  await expect(visible("Shopping")).toBeVisible();

  // Delete needs a confirmation.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("heading", { name: "Kopi Tuku" })).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page).toHaveURL(/\/app\/transactions$/);
  await expect(page.getByText("Kopi Tuku")).toHaveCount(0);
});

test("another user cannot open or change someone else's expense", async ({ browser, request }) => {
  const emailA = await seedUser(request, "Toko Rahasia A");
  const emailB = await seedUser(request, "Kedai B");
  const a = await (await browser.newContext()).newPage();
  await logIn(a, emailA);
  const rows = await (await a.request.get("/api/proxy/transactions?month=" + new Date().toISOString().slice(0, 7))).json();
  const id = rows.items[0].id;

  const b = await (await browser.newContext()).newPage();
  await logIn(b, emailB);
  expect((await b.request.get(`/api/proxy/transactions/${id}`)).status()).toBe(404);
  expect((await b.request.delete(`/api/proxy/transactions/${id}`)).status()).toBe(404);
  await b.goto(`/app/transactions/${id}`);
  await expect(b.getByText("does not exist or was deleted")).toBeVisible();
  expect((await a.request.get(`/api/proxy/transactions/${id}`)).status()).toBe(200);
});

test("responses carry security headers and unknown app pages show a friendly 404", async ({ page }) => {
  const login = await page.request.get("/login");
  const headers = login.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.goto("/app/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).filter({ visible: true })).toBeVisible();
});

test("search narrows the list and the export downloads a CSV of the user's own rows", async ({ page, request }) => {
  const email = await seedUser(request, "Warung Tegal");
  await logIn(page, email);
  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).first().click();
  const visible = (text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
  await expect(visible("Warung Tegal")).toBeVisible();

  await page.getByRole("searchbox", { name: "Search expenses" }).fill("nothing like this");
  await expect(visible("No expenses this month")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search expenses" }).fill("tegal");
  await expect(visible("Warung Tegal")).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("notarik-expenses.csv");
  const csv = await (await import("node:fs/promises")).readFile((await download.path())!, "utf8");
  expect(csv).toContain("date,merchant,category");
  expect(csv).toContain("Warung Tegal");
});

test("ask Notarik: answers from your data, proposes an expense and only saves after Confirm", async ({ page }) => {
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.getByRole("link", { name: "Chat" }).filter({ visible: true }).first().click();
  const seen = (text: string | RegExp) => page.getByText(text).filter({ visible: true });
  await expect(page.getByRole("heading", { name: "Ask Notarik" })).toBeVisible();

  await page.getByLabel("Message").filter({ visible: true }).fill("berapa pengeluaran bulan ini");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(seen(/Rp 25\.000/).first()).toBeVisible();

  // A proposal is not saved until it is confirmed: cancel first.
  await page.getByLabel("Message").filter({ visible: true }).fill("kopi 30rb");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(seen("Save Rp 30.000 as Food & Drink?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).filter({ visible: true }).click();
  await expect(seen("Cancelled. Nothing was changed.")).toBeVisible();

  await page.getByLabel("Message").filter({ visible: true }).fill("kopi 45rb");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(seen("Save Rp 45.000 as Food & Drink?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm" }).filter({ visible: true }).click();
  await expect(seen("Done. Saved.")).toBeVisible();

  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).first().click();
  await expect(page.getByText("Rp 45.000", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Rp 30.000", { exact: true }).filter({ visible: true })).toHaveCount(0);
});

test("the BFF rejects cross-site writes and unknown API areas", async ({ page }) => {
  const email = await seedUser(page.request, "Warung Tegal");
  await logIn(page, email);
  const crossSite = await page.request.post("/api/auth/logout", { headers: { origin: "https://evil.example" } });
  expect(crossSite.status()).toBe(403);
  const crossSiteWrite = await page.request.post("/api/proxy/transactions", { headers: { origin: "https://evil.example" }, data: {} });
  expect(crossSiteWrite.status()).toBe(403);
  expect((await page.request.get("/api/proxy/admin/abc")).status()).toBe(404);
  expect((await page.request.get("/api/proxy/auth/refresh")).status()).toBe(404);
  // Still signed in after the blocked attempts.
  expect((await page.request.get("/api/proxy/me")).status()).toBe(200);
});

test("an expired access token is renewed without logging out, even for parallel requests", async ({ page, context }) => {
  const email = await seedUser(page.request, "Warung Tegal");
  await logIn(page, email);
  await context.clearCookies({ name: "nt_access" });
  const results = await Promise.all([1, 2, 3].map(() => page.request.get("/api/proxy/me")));
  expect(results.map((r) => r.status())).toEqual([200, 200, 200]);
  expect((await context.cookies()).some((c) => c.name === "nt_access")).toBeTruthy();
});

for (const vp of [
  { name: "desktop", width: 1440, height: 900, nav: "sidebar" },
  { name: "tablet", width: 768, height: 1024, nav: "sidebar" },
  { name: "mobile", width: 390, height: 844, nav: "bottom" },
]) {
  test(`the shell shows a ${vp.nav} navigation at ${vp.width}px with no horizontal scroll`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await logIn(page, await seedUser(page.request, "Warung Tegal"));
    // The mobile Home has no spending list; the wide layout adds the month beneath it.
    if (vp.width >= 768) await expect(page.getByRole("main").getByText("Warung Tegal")).toBeVisible();
    else await expect(page.getByRole("heading", { level: 1 })).toContainText("Snap it.");

    const navs = page.getByRole("navigation", { name: "Main" });
    const visible = await navs.evaluateAll((els) =>
      els.filter((el) => el.getBoundingClientRect().width > 0).map((el) => {
        const box = el.getBoundingClientRect();
        return { top: box.top, left: box.left, width: box.width, bottom: box.bottom, height: box.height };
      }),
    );
    expect(visible).toHaveLength(1);
    const [box] = visible;
    if (vp.nav === "sidebar") {
      expect(box.left).toBeLessThan(64);
      expect(box.width).toBeGreaterThanOrEqual(180);
      expect(box.height).toBeGreaterThan(200);
    } else {
      // The floating pill: 34px above the bottom edge, 24px in from each side.
      expect(Math.round(vp.height - box.bottom)).toBe(34);
      expect(Math.round(box.left)).toBe(24);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await context.close();
  });
}

test("settings shows the account and saves a preference that survives a reload", async ({ page }) => {
  const email = await seedUser(page.request, "Warung Tegal");
  await logIn(page, email);
  await page.getByRole("link", { name: "Settings" }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  const main = page.getByRole("main");
  await expect(main.getByText(email)).toBeVisible();

  const notifications = main.getByRole("switch", { name: "Notifications" });
  await expect(notifications).toHaveAttribute("aria-checked", "true");
  await notifications.click();
  await expect(notifications).toHaveAttribute("aria-checked", "false");

  await page.reload();
  await expect(main.getByRole("switch", { name: "Notifications" })).toHaveAttribute("aria-checked", "false");
  await expect(main.getByRole("switch", { name: "Read receipts automatically" })).toHaveAttribute("aria-checked", "true");
});

// A 1x1 PNG: enough for the API to accept the upload. The e2e API has no LLM key, so nothing is read from it.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("scan a receipt: rejects a wrong file, then upload, fix the details and save", async ({ page }) => {
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.getByRole("link", { name: "Transactions" }).filter({ visible: true }).first().click();
  await page.getByRole("link", { name: "Scan receipt" }).click();
  await expect(page).toHaveURL(/\/app\/receipts\/new$/);
  const main = page.getByRole("main");

  await main.getByLabel("Receipt file").setInputFiles({ name: "note.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(main.getByRole("alert")).toContainText("JPEG, PNG or PDF");

  await main.getByLabel("Receipt file").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
  await expect(main.getByRole("heading", { name: "Check your receipt" })).toBeVisible();
  await expect(main.getByRole("img", { name: "Your uploaded receipt" })).toBeVisible();

  await main.getByLabel("Merchant").fill("Toko Scan");
  await main.getByLabel("Amount").fill("42rb");
  await main.getByRole("button", { name: "Save expense" }).click();
  await expect(page).toHaveURL(/\/app\/transactions\/[0-9a-f-]{36}$/);
  await expect(main.getByText("Toko Scan").first()).toBeVisible();
  await expect(main.getByText("Rp 42.000").first()).toBeVisible();
});

test("Google sign-in sends the token and nonce to our server and shows the failure, with no session", async ({ page, context }) => {
  for (const [path, label] of [["/login", "Continue with Google"], ["/signup", "Continue with Google"]] as const) {
    await page.goto(path);
    const sent = page.waitForRequest("**/api/auth/google");
    await page.getByRole("button", { name: label }).click();
    const body = (await sent).postDataJSON();
    expect(body.id_token).toBe("fake.id.token");
    expect(body.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(body.provider).toBeUndefined();
    // The e2e API has no Google client IDs, so it rejects any token.
    await expect(page.getByRole("alert").filter({ hasText: "Google sign-in failed" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect((await context.cookies()).some((c) => c.name === "nt_access")).toBeFalsy();
  }
});

test("the Google route refuses a malformed body and cross-site calls", async ({ page }) => {
  await page.goto("/login");
  expect((await page.request.post("/api/auth/google", { data: { id_token: "x" } })).status()).toBe(400);
  expect((await page.request.post("/api/auth/google", { data: { id_token: "x", nonce: "y" }, headers: { origin: "https://evil.example" } })).status()).toBe(403);
});

for (const vp of [
  { name: "mobile pill", width: 390, height: 844 },
  { name: "sidebar", width: 1280, height: 800 },
]) {
  test(`the menu has the mobile app's entries in order (${vp.name})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await logIn(page, await seedUser(page.request, "Warung Tegal"));
    const links = page.getByRole("navigation", { name: "Main" }).filter({ visible: true }).getByRole("link");
    await expect(links).toHaveText(vp.width < 768 ? ["", "", "", "", ""] : ["Home", "Transactions", "+Add", "Chat", "Settings"]);
    await expect(links.nth(0)).toHaveAccessibleName(/Home/);
    await expect(links.nth(1)).toHaveAccessibleName(/Transactions/);
    await expect(links.nth(2)).toHaveAttribute("href", "/app/transactions/new");
    await expect(links.nth(3)).toHaveAttribute("href", "/app/chat");
    await expect(links.nth(4)).toHaveAttribute("href", "/app/settings");
    await expect(links.nth(0)).toHaveAttribute("aria-current", "page");
    await context.close();
  });
}

test("the old Ask address leads to Chat", async ({ page }) => {
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.goto("/app/ask");
  await expect(page).toHaveURL(/\/app\/chat$/);
});

test("Home is the mobile Home: action cards, shortcuts and suggested questions", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toContainText("We'll sort it.");
  await expect(main.getByRole("link", { name: /Snap receipt/ })).toHaveAttribute("href", "/app/receipts/new");
  await expect(main.getByRole("link", { name: /Ask Notarik/ })).toHaveAttribute("href", "/app/chat");
  for (const [name, href] of [["Quick add", "/app/transactions/new"], ["Recap", "/app/recap"], ["Budget", "/app/recap"], ["Transactions", "/app/transactions"]]) {
    await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  // Nothing from the wide layout leaks into the mobile one.
  await expect(main.getByText("Warung Tegal")).toBeHidden();

  await main.getByRole("link", { name: "Log nasi goreng 25k" }).click();
  await expect(page).toHaveURL(/\/app\/chat\?prompt=/);
  await expect(page.getByRole("main").getByText("Log nasi goreng 25k").first()).toBeVisible();
  await context.close();
});

test("Transactions in the mobile layout: search toggle, month row, category chips, no wide-layout buttons", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await logIn(page, await seedUser(page.request, "Warung Tegal"));
  await page.goto("/app/transactions");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Transactions" })).toBeVisible();
  await expect(main.getByText("Warung Tegal")).toBeVisible();
  await expect(main.getByText("Spent")).toBeVisible();
  await expect(main.getByRole("radiogroup", { name: "Filter by category" }).getByRole("radio")).toHaveText(["All", "Food & Drink", "Groceries", "Transport", "Bills", "Shopping", "Other"]);
  await expect(main.getByRole("link", { name: "Scan receipt" })).toBeHidden();
  await expect(main.getByRole("button", { name: "Export CSV" })).toBeHidden();

  await expect(main.getByRole("searchbox", { name: "Search expenses" })).toBeHidden();
  await main.getByRole("button", { name: "Search" }).click();
  const box = main.getByRole("searchbox", { name: "Search expenses" });
  await expect(box).toBeFocused();
  await box.fill("nothing like this");
  await expect(main.getByText("No expenses this month")).toBeVisible();
  await main.getByRole("button", { name: "Close search" }).click();
  await expect(box).toBeHidden();
  await expect(main.getByText("Warung Tegal")).toBeVisible();
  await context.close();
});
