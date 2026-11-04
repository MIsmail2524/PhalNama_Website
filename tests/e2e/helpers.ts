import { expect, type Page } from "@playwright/test";

export const uniquePhone = () => "0300" + String(Date.now()).slice(-7);

export async function addKinnowToBag(page: Page, pack = "5 KG Family Pack") {
  await page.goto("/shop/bhalwal-kinnow");
  await page.getByRole("radio", { name: new RegExp(pack) }).check();
  await page.getByRole("button", { name: /^Add to bag/ }).first().click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
}

export async function fillCheckout(page: Page, o: { name?: string; phone: string; city?: string; address?: string }) {
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill(o.name ?? "E2E Customer");
  await page.getByLabel("Mobile number").fill(o.phone);
  await page.getByLabel("City").selectOption(o.city ?? "Lahore");
  await page.getByLabel("Complete address").fill(o.address ?? `House ${o.phone.slice(-4)}, Street 9, Test Town`);
  // wait for the live server quote
  await expect(page.getByText(/^Rs [\d,]+$/).last()).toBeVisible();
}

export async function adminLogin(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}
