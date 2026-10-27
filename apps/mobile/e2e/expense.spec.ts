import { expect, test, type Page } from "@playwright/test";

const textbox = (page: Page, name: string) =>
  page.getByRole("textbox", { name }).filter({ visible: true });
const button = (page: Page, name: string | RegExp) =>
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
  await button(page, "Delete transaction").click();
  await button(page, "Confirm delete").click();
  await expect(
    page.getByText("No expenses this month").filter({ visible: true }).first(),
  ).toBeVisible();
});

test("quick add: several expenses are listed, one is recategorised, and all are saved at once", async ({ page }) => {
  await signUp(page, `e2e-many-${Date.now()}@example.com`);
  await tab(page, "Add").click();
  await textbox(page, "What did you spend?").fill("kopi 25rb, parkir 5rb");
  await expect(page.getByText("Notarik understood 2 expenses")).toBeVisible();
  await expect(page.getByText("Rp 30.000").first()).toBeVisible();

  await button(page, "Change category of Kopi").click();
  await radio(page, "Shopping").click();

  await button(page, "Save 2 expenses").click();
  await expect(page.getByText("Kopi").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Parkir").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Rp 25.000").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Rp 5.000").filter({ visible: true }).first()).toBeVisible();
});

test("quick add: an expense without an amount blocks saving until it is removed", async ({ page }) => {
  await signUp(page, `e2e-missing-${Date.now()}@example.com`);
  await tab(page, "Add").click();
  await textbox(page, "What did you spend?").fill("kopi 25rb, parkir");
  await expect(page.getByText("Notarik understood 2 expenses")).toBeVisible();
  await expect(textbox(page, "Amount of Parkir")).toBeVisible();

  await button(page, "Save 2 expenses").click();
  await expect(page.getByRole("alert")).toContainText("Add an amount");

  await button(page, "Remove Parkir").click();
  await expect(page.getByText("Notarik understood 2 expenses")).toHaveCount(0);
  await button(page, "Save expense").click();
  await expect(page.getByText("Kopi", { exact: true })).toBeVisible();
});

test("quick add: save the lines as one expense with items", async ({ page }) => {
  await signUp(page, `e2e-one-${Date.now()}@example.com`);
  await tab(page, "Add").click();
  await textbox(page, "What did you spend?").fill("nasi 20rb, teh 5rb di warteg");
  await expect(page.getByText("Notarik understood 2 expenses")).toBeVisible();

  await page.getByRole("switch", { name: "Save as one expense" }).filter({ visible: true }).click();
  await button(page, "Save as one expense").click();
  await expect(page.getByText("Warteg", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp 25.000").first()).toBeVisible();
  await expect(page.getByText("2 items")).toBeVisible();
});

test("sign up stores the name and shows it in settings", async ({ page }) => {
  const email = `e2e-name-${Date.now()}@example.com`;
  await signUp(page, email, "Ada Lovelace");
  await tab(page, "Settings").click();
  await expect(page.getByText("Ada Lovelace").filter({ visible: true })).toBeVisible();
  await expect(page.getByText(email).filter({ visible: true })).toBeVisible();
});

test("settings: switches persist, sheets open and data exports", async ({ page }) => {
  const email = `e2e-settings-${Date.now()}@example.com`;
  await signUp(page, email, "Ada Lovelace");

  // One expense so the export has a row, with a formula-like merchant.
  await tab(page, "Add").click();
  await textbox(page, "What did you spend?").fill("makan siang 25rb di warung");
  await button(page, "Save expense").click();
  await expect(page.getByText("Warung", { exact: true })).toBeVisible();
  await button(page, "Back").click();

  await tab(page, "Settings").click();
  const sw = (name: string) => page.getByRole("switch", { name }).filter({ visible: true });
  await expect(sw("Auto-read receipts")).toHaveAttribute("aria-checked", "true");
  // The safety rule: saving always needs a confirmation, so this one cannot be turned off.
  await expect(sw("Confirm before saving")).toHaveAttribute("aria-checked", "true");
  await expect(sw("Confirm before saving")).toHaveAttribute("aria-disabled", "true");

  await sw("Auto-read receipts").click();
  await sw("Notifications").click();
  await expect(sw("Auto-read receipts")).toHaveAttribute("aria-checked", "false");
  await expect(sw("Notifications")).toHaveAttribute("aria-checked", "false");
  await page.reload({ waitUntil: "domcontentloaded" });
  await tab(page, "Settings").click();
  await expect(sw("Auto-read receipts")).toHaveAttribute("aria-checked", "false");
  await expect(sw("Notifications")).toHaveAttribute("aria-checked", "false");

  // Light only for now: there is no theme choice.
  await expect(button(page, "Theme")).toHaveCount(0);

  await button(page, "Categories").click();
  await expect(page.getByText(/Groceries, Food & Drink/).filter({ visible: true })).toBeVisible();
  await button(page, "Close").click();

  const download = page.waitForEvent("download");
  await button(page, "Export data").click();
  expect((await download).suggestedFilename()).toBe("notarik-expenses.csv");

  await button(page, "Budgets").click();
  await expect(page.getByText("Recap").filter({ visible: true }).first()).toBeVisible();
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
  await expect(button(page, "Change category")).toContainText("Shopping");

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

async function addByText(page: Page, text: string) {
  await tab(page, "Add").click();
  await textbox(page, "What did you spend?").fill(text);
  await button(page, "Save expense").click();
  await expect(button(page, "Change category")).toBeVisible();
}

test("transactions: days with totals, category filter, search and months", async ({ page }) => {
  await signUp(page, `e2e-list-${Date.now()}@example.com`);
  await addByText(page, "makan siang 35rb di warteg");
  await button(page, "Back").click();
  await addByText(page, "belanja 120rb di indomaret");
  await button(page, "Back").click();
  await tab(page, "Transactions").click();

  await expect(page.getByText("Today", { exact: true })).toBeVisible();
  await expect(page.getByText("Rp 155.000").first()).toBeVisible(); // the day and the month
  await expect(button(page, /Warteg, Rp 35.000/)).toBeVisible();
  await expect(button(page, /Indomaret, Rp 120.000/)).toBeVisible();

  await radio(page, "Groceries").click();
  await expect(button(page, /Indomaret/)).toBeVisible();
  await expect(button(page, /Warteg/)).toBeHidden();
  await radio(page, "All").click();

  await button(page, "Search").click();
  await textbox(page, "Search expenses").fill("warteg");
  await expect(button(page, /Warteg/)).toBeVisible();
  await expect(button(page, /Indomaret/)).toBeHidden();
  await textbox(page, "Search expenses").fill("zzzz");
  await expect(page.getByText("No matching expenses")).toBeVisible();
  await button(page, "Close search").click();

  await button(page, "Previous month").click();
  await expect(page.getByText("No expenses this month")).toBeVisible();
  await button(page, "Next month").click();
  await button(page, /Warteg/).click();
  await expect(page.getByText("Details", { exact: true })).toBeVisible();
});

test("transaction details: category, payment, note, items and delete from the menu", async ({ page }) => {
  await signUp(page, `e2e-detail-${Date.now()}@example.com`);
  await addByText(page, "makan siang 35rb di warteg");
  await expect(page.getByText("Rp 35.000").first()).toBeVisible();
  await expect(page.getByText("Add payment")).toBeVisible();

  await button(page, "Change category").click();
  await radio(page, "Groceries").click();
  await expect(button(page, "Change category")).toContainText("Groceries");

  await button(page, "Change payment").click();
  await radio(page, "QRIS").click();
  await expect(button(page, "Change payment")).toContainText("QRIS");

  await button(page, "Change note").click();
  await textbox(page, "Note").fill("with Ada");
  await textbox(page, "Note").press("Enter");
  await expect(button(page, "Change note")).toContainText("with Ada");
  // Not from a receipt: no receipt row, and it has no items.
  await expect(button(page, "View receipt")).toBeHidden();

  await button(page, "More").click();
  await button(page, "Delete expense").click();
  await button(page, "Confirm delete").click();
  await expect(page.getByText("No expenses this month")).toBeVisible();
});

test("recap and budget: ring, categories and editing the budgets", async ({ page }) => {
  await signUp(page, `e2e-recap-${Date.now()}@example.com`);
  await addByText(page, "makan siang 120rb di warteg");
  await button(page, "Back").click();
  await page.getByText("Recap", { exact: true }).first().click();
  await expect(page.getByText("Recap & Budget")).toBeVisible();
  await expect(page.getByText("Rp 120.000").first()).toBeVisible();
  await expect(page.getByText("No budget", { exact: true })).toBeVisible();

  await button(page, "Edit budgets").click();
  await textbox(page, "Monthly budget").fill("1jt");
  await textbox(page, "Food & Drink budget").fill("100rb");
  await button(page, "Save budgets").click();

  await expect(page.getByText("12%")).toBeVisible();
  await expect(page.getByText("of Rp 1.000.000")).toBeVisible();
  await expect(page.getByText("Rp 20.000 over")).toBeVisible();
  await expect(page.getByText("of Rp 100.000")).toBeHidden();

  await button(page, "Previous month").click();
  await expect(page.getByText("No spending this month yet")).toBeVisible();
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
  await button(page, "Close").last().click();
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

test("onboarding: reduce motion shows the final layout at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cta = button(page, "Get started");
  await expect(cta).toBeVisible();
  // No entrance: the buttons are fully opaque as soon as they exist.
  await expect
    .poll(() => cta.evaluate((node) => getComputedStyle(node.parentElement as HTMLElement).opacity))
    .toBe("1");
  await cta.click();
  await expect(page.getByText("Create account").first()).toBeVisible();
});

test("onboarding: tapping the mascot and the icons plays a reaction and stays on the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Your money,").first()).toBeVisible();
  await page.waitForTimeout(1800);
  // Mascot, then camera and receipt icons.
  for (const [x, y] of [
    [195, 265],
    [95, 160],
    [310, 370],
  ]) {
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
  }
  await expect(page.getByText("Your money,").first()).toBeVisible();
  await expect(button(page, "Get started")).toBeVisible();
  // The decorative hero is not exposed as buttons or images to a screen reader.
  await expect(page.getByRole("button")).toHaveCount(2);
});

test("onboarding: the entrance plays again when the screen is opened again", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cta = button(page, "Get started");
  const opacity = () => cta.evaluate((node) => getComputedStyle(node.parentElement as HTMLElement).opacity);
  await expect.poll(opacity, { timeout: 8000 }).toBe("1");

  await cta.click();
  await expect(page.getByText("Create your account").first()).toBeVisible();
  await button(page, "Back").click();

  // Coming back starts the entrance from the beginning, so the buttons are not fully shown at first.
  await expect.poll(async () => Number(await opacity()), { timeout: 3000 }).toBeLessThan(1);
  await expect.poll(opacity, { timeout: 8000 }).toBe("1");
});
