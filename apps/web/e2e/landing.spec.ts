import { expect, test } from "@playwright/test";

const widths = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "small laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

for (const vp of widths) {
  test.describe(`landing at ${vp.name} (${vp.width}px)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("shows the headline, three store badges and no horizontal scroll", async ({ page }) => {
      await page.goto("/");

      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toContainText("Snap it.");
      const lines = await h1.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
      expect(lines).toBeLessThanOrEqual(2);

      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Open app", exact: true }).first()).toBeVisible();
      const stores = main.getByRole("list").filter({ has: page.getByRole("img", { name: /App Store/ }) }).first();
      await expect(stores.getByRole("img", { name: /App Store/ })).toBeVisible();
      await expect(stores.getByRole("img", { name: /Google Play/ })).toBeVisible();
      await expect(stores.getByText("Coming soon")).toHaveCount(2);
      // In a flex row the badge used to shrink sideways and look squashed.
      const play = await stores.getByRole("img", { name: /Google Play/ }).boundingBox();
      expect(play!.width / play!.height).toBeCloseTo(646 / 250, 1);
      await expect(stores.getByText("Web app")).toHaveCount(0);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("web app links point to /app and the footer credits the author", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Open web app" })).toHaveAttribute("href", "/app");
      await expect(page.getByRole("link", { name: "Open app", exact: true }).first()).toHaveAttribute("href", "/app");
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
