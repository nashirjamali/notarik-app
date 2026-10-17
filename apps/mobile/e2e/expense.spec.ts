import { expect, test } from "@playwright/test";

test("sign up, add an expense, see it, and delete it", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const date = new Date().toISOString().slice(0, 10);

  const textbox = (name: string) =>
    page.getByRole("textbox", { name }).filter({ visible: true });
  const button = (name: string) =>
    page.getByRole("button", { name }).filter({ visible: true });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Sign up" }).click();
  await textbox("Email").fill(email);
  await textbox("Password").fill("password123");
  await button("Sign up").click();
  await expect(page.getByText("This month")).toBeVisible();

  await page.getByRole("tab", { name: "Add" }).click();
  await textbox("Merchant").fill("Warung");
  await textbox("Date").fill(date);
  await textbox("Total").fill("25000");
  await button("Save").click();
  await expect(page.getByText("Warung").filter({ visible: true })).toBeVisible();

  await button("Back").click();
  await page.getByRole("tab", { name: "Transactions" }).click();
  await page.getByText("Warung").filter({ visible: true }).click();
  await button("Delete").click();
  await button("Confirm delete").click();
  await expect(page.getByText("No expenses this month").filter({ visible: true }).first()).toBeVisible();
});
