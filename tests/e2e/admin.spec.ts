import { test, expect } from "@playwright/test";
import { E2E } from "./global-setup";
import { addKinnowToBag, adminLogin, alertBox, fillCheckout, uniquePhone } from "./helpers";

test.describe("Admin journeys", () => {
  test("A1 admin portal is reachable from the footer and rejects a wrong password", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Team login" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByLabel("Email", { exact: true }).fill(E2E.adminEmail);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(alertBox(page)).toContainText("incorrect");
  });

  test("A2 order lifecycle: new order appears, status updated, note added, customer sees it", async ({ page, browser }) => {
    const phone = uniquePhone();
    const shopper = await browser.newPage();
    await addKinnowToBag(shopper);
    await fillCheckout(shopper, { phone });
    await shopper.getByRole("button", { name: "Place order" }).click();
    await shopper.waitForURL(/success/);
    const number = new URL(shopper.url()).searchParams.get("order")!;

    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.getByRole("link", { name: "Orders" }).first().click();
    await page.getByPlaceholder(/Order no/).fill(number);
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("link", { name: number }).click();
    await page.getByLabel("Change status").selectOption("DISPATCHED");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText(/Status changed from PENDING to DISPATCHED/)).toBeVisible();
    await page.getByPlaceholder("Only visible to the team").fill("Called customer, confirmed address");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Called customer, confirmed address")).toBeVisible();

    await shopper.goto(`/track?order=${number}&phone=${phone}`);
    await expect(shopper.getByLabel("Order status")).toContainText("On its way");
    await shopper.close();
  });

  test("A3 add a new fruit: activate category + product with price → visible in shop", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    const slug = `e2e-fruit-${Date.now()}`;
    await page.goto("/admin/r/categories/new");
    await page.locator('input[name="name"]').fill(`Test Fruit ${slug.slice(-4)}`);
    await page.locator('input[name="slug"]').fill(slug);
    await page.locator('select[name="status"]').selectOption("ACTIVE");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/saved=1/);

    await page.goto("/admin/products/new");
    await page.locator('input[name="name"]').fill(`Test Product ${slug.slice(-4)}`);
    await page.locator('input[name="slug"]').fill(`${slug}-p`);
    await page.locator('select[name="categoryId"]').selectOption({ label: `Test Fruit ${slug.slice(-4)}` });
    await page.locator('select[name="status"]').selectOption("ACTIVE");
    await page.getByLabel(/Pack name/).fill("2 KG Box");
    await page.getByLabel(/Net fruit weight/).fill("2");
    await page.getByLabel(/^Price \(PKR\)/).fill("999");
    await page.getByLabel(/^Stock/).fill("5");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/saved=1/);

    await page.goto(`/shop/${slug}-p`);
    await expect(page.getByRole("button", { name: /Add to bag · Rs 999/ })).toBeVisible();
  });

  test("A4 homepage headline edited in the dashboard shows on the site", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto("/admin/settings/home");
    const headline = `Fresh from Bhalwal ${Date.now() % 1000}`;
    await page.getByLabel("Headline", { exact: true }).fill(headline);
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(headline);
  });

  test("A5 harvest batch with QR → public trace page shows recorded facts only", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto("/admin/batches/new");
    const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
    await page.getByLabel("Batch code").fill(code);
    await page.getByLabel("Selection grade").fill("Grade A");
    await page.getByLabel("Harvest date").fill("2026-11-01");
    await page.getByRole("button", { name: "Create batch" }).click();
    await expect(page.getByText("QR code")).toBeVisible();
    await page.goto(`/trace/${code}`);
    await expect(page.getByText("Grade A")).toBeVisible();
    await expect(page.getByText("1 November 2026")).toBeVisible();
    await expect(page.getByText("Packing date")).toHaveCount(0);
  });

  test("A6 coupon created in admin works at checkout", async ({ page, browser }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    const code = `E2E${Date.now().toString(36).toUpperCase()}`;
    await page.goto("/admin/r/coupons/new");
    await page.locator('input[name="code"]').fill(code);
    await page.locator('select[name="type"]').selectOption("FIXED");
    await page.locator('input[name="value"]').fill("400");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/saved=1/);

    const s = await browser.newPage();
    await addKinnowToBag(s);
    await fillCheckout(s, { phone: uniquePhone() });
    await s.getByPlaceholder("Coupon code").fill(code);
    await s.getByRole("button", { name: "Apply" }).click();
    await expect(s.getByText("− Rs 400")).toBeVisible();
    await s.close();
  });

  test("A7 orders export downloads a CSV", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto("/admin/orders");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Export CSV" }).click()]);
    expect(dl.suggestedFilename()).toMatch(/phalnama-orders-.*\.csv/);
  });

  test("A8 editor role cannot open orders, settings or team", async ({ page }) => {
    await adminLogin(page, E2E.editorEmail, E2E.adminPassword);
    await expect(page.getByRole("link", { name: "Orders" })).toHaveCount(0);
    for (const path of ["/admin/orders", "/admin/settings/payments", "/admin/team"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\?denied=/);
    }
    await page.goto("/admin/r/articles");
    await expect(page.getByRole("heading", { name: "Harvest Journal" })).toBeVisible();
  });

  test("A9 sign out ends the admin session", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await page.waitForURL(/\/admin\/login/);
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
