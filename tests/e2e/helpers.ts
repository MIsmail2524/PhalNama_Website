import { expect, type Page } from "@playwright/test";

/** App alerts only (ignores Next.js's hidden route announcer). */
export const alertBox = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

export const uniquePhone = () => "0300" + String(Date.now()).slice(-7);

export async function addKinnowToBag(page: Page, pack = "5 KG Family Pack") {
  await page.goto("/shop/bhalwal-kinnow");
  await page.getByRole("radio", { name: new RegExp(pack) }).check();
  await page.getByRole("button", { name: /^Add to bag/ }).first().click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
}

export async function fillCheckout(page: Page, o: { name?: string; phone: string; city?: string; address?: string }) {
  await page.goto("/checkout");
  const main = page.getByRole("main");
  await main.getByLabel("Full name").fill(o.name ?? "E2E Customer");
  await main.getByLabel("Mobile number").fill(o.phone);
  await main.getByRole("combobox", { name: /^City/ }).selectOption(o.city ?? "Lahore");
  await main.getByLabel("Complete address").fill(o.address ?? `House ${o.phone.slice(-4)}, Street 9, Test Town`);
  // wait for the live server quote
  await expect(page.getByText(/^Rs [\d,]+$/).last()).toBeVisible();
}

export async function adminLogin(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

/** Waits for an admin save to redirect with ?saved=1, or fails showing the form's error message. */
export async function expectSaved(page: Page) {
  const err = page.locator("form .text-danger").first();
  await expect.poll(async () => (page.url().includes("saved=1") ? "saved" : (await err.isVisible()) ? `error: ${await err.innerText()}` : "pending"), { timeout: 15_000 }).toBe("saved");
}
