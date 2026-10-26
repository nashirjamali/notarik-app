import { expect, test, type Page } from "@playwright/test";

const textbox = (page: Page, name: string) =>
  page.getByRole("textbox", { name }).filter({ visible: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name }).filter({ visible: true });
const radio = (page: Page, name: string) =>
  page.getByRole("radio", { name }).filter({ visible: true });
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
  await textbox(page, "What did you spend?").fill("makan siang 25rb di warung");
  await expect(page.getByText("Notarik understood")).toBeVisible();
  await expect(page.getByText("Rp 25.000").first()).toBeVisible();
  await button(page, "Save expense").click();
  await expect(page.getByText("Warung", { exact: true })).toBeVisible();

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

test("add expense: category override, missing amount, close and receipt shortcut", async ({ page }) => {
  await signUp(page, `e2e-quick-${Date.now()}@example.com`);
  await tab(page, "Add").click();

  // No amount yet: nothing to preview and saving explains why.
  await textbox(page, "What did you spend?").fill("makan siang di warteg");
  await expect(page.getByText("Notarik understood")).toBeHidden();
  await button(page, "Save expense").click();
  await expect(page.getByRole("alert")).toContainText("Add an amount");

  // The words pick a category; tapping a chip overrides it.
  await textbox(page, "What did you spend?").fill("bayar listrik 450rb");
  await expect(radio(page, "Bills")).toBeChecked();
  await radio(page, "Shopping").click();
  await expect(radio(page, "Shopping")).toBeChecked();
  await button(page, "Save expense").click();
  await expect(page.getByText(/· Shopping/)).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await tab(page, "Add").click();
  await button(page, "Voice").click();
  await expect(page.getByRole("alert")).toContainText("not available yet");
  await button(page, "Snap receipt").click();
  await expect(page.getByText("Fit the whole receipt in the frame")).toBeVisible();
});

test("chat: log an expense by talking, then ask about it", async ({ page }) => {
  await signUp(page, `e2e-chat-${Date.now()}@example.com`, "Ada");
  await tab(page, "Chat").click();
  await expect(page.getByText(/Hi Ada! Ask me about your spending/)).toBeVisible();

  const message = textbox(page, "Message");
  await message.fill("kopi 25rb tadi pagi");
  await button(page, "Send").click();
  await expect(page.getByText("Got it. Here's what I'll log:")).toBeVisible();
  await expect(page.getByText("Rp 25.000").first()).toBeVisible();
  // Nothing is saved until Save is pressed.
  await button(page, "Save").click();
  await expect(page.getByText("Saved. It's in your transactions.")).toBeVisible();

  await message.fill("How much did I spend on food this month?");
  await message.press("Enter");
  await expect(page.getByText(/You spent Rp 25.000 on food this month/)).toBeVisible();
});

test("chat: edit a proposal, cancel a budget and start a new chat", async ({ page }) => {
  await signUp(page, `e2e-chat2-${Date.now()}@example.com`);
  await tab(page, "Chat").click();
  const message = textbox(page, "Message");

  await message.fill("makan siang 35rb di warteg");
  await message.press("Enter");
  await expect(page.getByText("Warteg").first()).toBeVisible();
  await button(page, "Edit").click();
  await textbox(page, "Amount").fill("40000");
  await button(page, "Save").click();
  await expect(page.getByText("Saved. It's in your transactions.")).toBeVisible();
  await message.fill("berapa pengeluaran bulan ini");
  await message.press("Enter");
  await expect(page.getByText(/You spent Rp 40.000 this month/)).toBeVisible();

  await message.fill("set budget 4 juta");
  await message.press("Enter");
  await expect(page.getByText("Rp 4.000.000").first()).toBeVisible();
  await button(page, "Cancel").click();
  await expect(page.getByText("Nothing was saved.")).toBeVisible();

  await button(page, "New chat").click();
  await expect(page.getByText("Nothing was saved.")).toBeHidden();
  await expect(page.getByText(/Ask me about your spending/)).toBeVisible();
});

test("chat: a Home suggestion opens the chat with the answer, and the camera opens Snap receipt", async ({ page }) => {
  await signUp(page, `e2e-chat3-${Date.now()}@example.com`);
  await page.getByText("Am I on track this month?").first().click();
  await expect(page.getByText(/No budget is set for/)).toBeVisible();
  await button(page, "Scan a receipt").click();
  await expect(page.getByText("Fit the whole receipt in the frame")).toBeVisible();
});

test("add expense: the close button returns to home", async ({ page }) => {
  await signUp(page, `e2e-sheet-${Date.now()}@example.com`);
  await tab(page, "Add").click();
  await expect(page.getByText("Add expense").first()).toBeVisible();
  await button(page, "Close sheet").click();
  await expect(page.getByText("Snap it.").first()).toBeVisible();
});

test("snap receipt: upload a photo, review it and save the expense", async ({ page }) => {
  await signUp(page, `e2e-snap-${Date.now()}@example.com`);
  await page.getByText("Snap receipt").first().click();
  await expect(page.getByText("Fit the whole receipt in the frame")).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await button(page, "Gallery").click();
  await (await chooser).setFiles("e2e/fixtures/receipt.png");

  // The server has no model key in e2e, so the draft is empty and the user fills it in.
  await expect(page.getByText("Review receipt")).toBeVisible();
  await textbox(page, "Merchant").fill("Warung Snap");
  await textbox(page, "Total").fill("30000");
  await button(page, "Groceries").click();
  await textbox(page, "Note").fill("weekly shop");
  await button(page, "Save expense").click();
  await expect(page.getByText("Warung Snap").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("weekly shop")).toBeVisible();
});

test("review receipt: validation, retake and discard", async ({ page }) => {
  await signUp(page, `e2e-review-${Date.now()}@example.com`);
  await page.getByText("Snap receipt").first().click();
  let chooser = page.waitForEvent("filechooser");
  await button(page, "Gallery").click();
  await (await chooser).setFiles("e2e/fixtures/receipt.png");
  await expect(page.getByText("Review receipt")).toBeVisible();

  // Nothing was read from the image, so saving an empty form is refused with hints.
  await button(page, "Save expense").click();
  await expect(page.getByText("Enter a merchant")).toBeVisible();
  await expect(page.getByText(/Enter an amount/)).toBeVisible();

  await button(page, "Retake").click();
  await expect(page.getByText("Fit the whole receipt in the frame")).toBeVisible();
  chooser = page.waitForEvent("filechooser");
  await button(page, "Gallery").click();
  await (await chooser).setFiles("e2e/fixtures/receipt.png");
  await button(page, "Discard").click();
  await expect(page.getByText("Snap it.").first()).toBeVisible();
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
