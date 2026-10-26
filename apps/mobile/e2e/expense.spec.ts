import { expect, test, type Page } from "@playwright/test";

const textbox = (page: Page, name: string) =>
  page.getByRole("textbox", { name }).filter({ visible: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name }).filter({ visible: true });
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name }).filter({ visible: true });

async function signUp(page: Page, email: string, name?: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await button(page, "Get started").click();
  if (name) await textbox(page, "Name").fill(name);
  await textbox(page, "Email").fill(email);
  await textbox(page, "Password").fill("password123");
  await button(page, "Create account").click();
  await expect(page.getByText("Snap it.").first()).toBeVisible();
}

test("sign up, add an expense, see it, and delete it", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const date = new Date().toISOString().slice(0, 10);

  await signUp(page, email);

  await tab(page, "Add").click();
  await textbox(page, "Merchant").fill("Warung");
  await textbox(page, "Date").fill(date);
  await textbox(page, "Total").fill("25000");
  await button(page, "Save").click();
  await expect(page.getByText("Warung").filter({ visible: true })).toBeVisible();

  await button(page, "Back").click();
  await tab(page, "Transactions").click();
  await page.getByText("Warung").filter({ visible: true }).click();
  await button(page, "Delete").click();
  await button(page, "Confirm delete").click();
  await expect(
    page.getByText("No expenses this month").filter({ visible: true }).first(),
  ).toBeVisible();
});

test("sign up stores the name and shows it in settings", async ({ page }) => {
  await signUp(page, `e2e-name-${Date.now()}@example.com`, "Ada Lovelace");
  await tab(page, "Settings").click();
  await expect(page.getByText("Signed in as Ada Lovelace")).toBeVisible();
});

test("sign up rejects a short password before calling the API", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await button(page, "Get started").click();
  await textbox(page, "Email").fill(`e2e-short-${Date.now()}@example.com`);
  await textbox(page, "Password").fill("tiny");
  await button(page, "Create account").click();
  await expect(page.getByRole("alert")).toContainText("at least 8 characters");
});

test("snap receipt: upload a photo, review it and save the expense", async ({ page }) => {
  await signUp(page, `e2e-snap-${Date.now()}@example.com`);
  await page.getByText("Snap receipt").first().click();
  await expect(page.getByText("Fit the whole receipt in the frame")).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await button(page, "Gallery").click();
  await (await chooser).setFiles("e2e/fixtures/receipt.png");

  // The server has no model key in e2e, so the draft is empty and the user fills it in.
  await expect(page.getByText("Check your receipt")).toBeVisible();
  await textbox(page, "Merchant").fill("Warung Snap");
  await textbox(page, "Total").fill("30000");
  await button(page, "Save expense").click();
  await expect(page.getByText("Warung Snap").filter({ visible: true })).toBeVisible();
});

test("snap receipt: close returns to home", async ({ page }) => {
  await signUp(page, `e2e-close-${Date.now()}@example.com`);
  await page.getByText("Snap receipt").first().click();
  await button(page, "Close").click();
  await expect(page.getByText("Snap it.").first()).toBeVisible();
});

test("log out, then log in again from the onboarding screen", async ({ page }) => {
  const email = `e2e-login-${Date.now()}@example.com`;

  await signUp(page, email);
  await tab(page, "Settings").click();
  await button(page, "Log out").click();

  await button(page, "I already have an account").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  // Empty form: the submit button stays disabled.
  await expect(button(page, "Log in")).toHaveAttribute("aria-disabled", "true");

  // Wrong password: the API error is shown and we stay on the login screen.
  await textbox(page, "Email").fill(email);
  await textbox(page, "Password").fill("wrong-password");
  await button(page, "Log in").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Welcome back")).toBeVisible();

  // The eye toggle switches the password field between hidden and visible.
  await expect(textbox(page, "Password")).toHaveAttribute("type", "password");
  await button(page, "Show password").click();
  await expect(textbox(page, "Password")).not.toHaveAttribute("type", "password");

  await textbox(page, "Password").fill("password123");
  await button(page, "Log in").click();
  await expect(page.getByText("Snap it.").first()).toBeVisible();
});

test("login screen links: back to onboarding and over to sign up", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await button(page, "I already have an account").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  await button(page, "Back").click();
  await expect(button(page, "Get started")).toBeVisible();

  await button(page, "I already have an account").click();
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByText("Create your")).toBeVisible();
  await expect(button(page, "Create account")).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page.getByText("Welcome back")).toBeVisible();
});
