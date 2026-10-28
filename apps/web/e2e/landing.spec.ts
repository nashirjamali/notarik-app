import { expect, test } from "@playwright/test";

const widths = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

for (const vp of widths) {
  test.describe(`landing at ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows the headline, three store badges and no horizontal scroll", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { level: 1 })).toContainText("Snap it.");

      const badges = page.getByRole("main").getByRole("list").filter({ hasText: "Available on the" }).first();
      await expect(badges.getByText("Web app")).toBeVisible();
      await expect(badges.getByText("App Store")).toBeVisible();
      await expect(badges.getByText("Google Play")).toBeVisible();
      await expect(badges.getByText("Coming soon")).toHaveCount(2);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("web app links point to /app and the footer credits the author", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Open web app" })).toHaveAttribute("href", "/app");
      await expect(page.getByRole("link", { name: /Web app/ }).first()).toHaveAttribute("href", "/app");
      await expect(page.getByRole("link", { name: "nashir.tech" })).toHaveAttribute(
        "href",
        "https://nashir.tech",
      );
    });
  });
}

test("has one h1, an outline of h2 sections and basic SEO metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h2")).toHaveCount(5);
  await expect(page).toHaveTitle(/Notarik/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /receipt/i);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
});

test("serves robots.txt and sitemap.xml", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
});
