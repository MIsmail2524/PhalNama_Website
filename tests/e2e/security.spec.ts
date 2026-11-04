import { test, expect } from "@playwright/test";
import { E2E } from "./global-setup";
import { adminLogin, alertBox } from "./helpers";

test.describe("Security", () => {
  test("S1 security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("SAMEORIGIN");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("S2 admin pages and APIs require authentication", async ({ request }) => {
    for (const p of ["/admin", "/admin/orders", "/admin/r/coupons", "/admin/label/x"]) {
      const r = await request.get(p, { maxRedirects: 0 });
      expect(r.status(), p).toBe(307);
      expect(r.headers()["location"]).toContain("/admin/login");
    }
    expect((await request.get("/api/admin/export?resource=orders")).status()).toBe(401);
    expect((await request.get("/api/cron/rewards")).status()).toBe(401);
    expect((await request.get("/api/cron/rewards", { headers: { authorization: "Bearer guess" } })).status()).toBe(401);
  });

  test("S3 forged / tampered admin session token is rejected", async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addCookies([{ name: "pn_admin", value: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6Ik9XTkVSIiwia2luZCI6ImFkbWluIn0.forged", url: "http://localhost:3100" }]);
    const p = await ctx.newPage();
    await p.goto("/admin");
    await expect(p).toHaveURL(/\/admin\/login/);
    await ctx.close();
  });

  test("S4 stored XSS payload in contact form is rendered as text in admin", async ({ page }) => {
    const payload = `<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
    await page.goto("/contact");
    const m = page.getByRole("main");
    await m.getByLabel(/^Name/).fill("XSS Tester");
    await m.getByLabel(/^Email/).fill("xss@example.com");
    await m.getByLabel(/^Message/).fill(payload);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/Thank you for writing/)).toBeVisible();

    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto("/admin/r/enquiries?q=XSS+Tester");
    await page.getByRole("link", { name: /CONTACT/ }).first().click();
    await expect(page.getByText(payload)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("S5 javascript: links are refused in banners", async ({ page }) => {
    await adminLogin(page, E2E.adminEmail, E2E.adminPassword);
    await page.goto("/admin/r/banners/new");
    await page.locator('input[name="message"]').fill("Malicious banner");
    await page.getByLabel("Link URL").fill("javascript:alert(document.cookie)");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Use a link starting with / or https://")).toBeVisible();
  });

  test("S6 sign-in next parameter cannot redirect off-site", async ({ page }) => {
    const phone = "0300" + String(Date.now()).slice(-7);
    await page.goto("/account/register?next=//evil.example.com");
    const m = page.getByRole("main");
    await m.getByLabel("Full name").fill("Redirect Tester");
    await m.getByLabel("Mobile number").fill(phone);
    await m.getByLabel("Password", { exact: false }).fill("orchard-pass-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/localhost:3100\/account$/);
  });

  test("S7 client cannot change prices: tampered bag price is ignored by the server", async ({ page }) => {
    await page.goto("/shop/bhalwal-kinnow");
    await page.getByRole("button", { name: /^Add to bag/ }).first().click();
    await page.evaluate(() => {
      const bag = JSON.parse(localStorage.getItem("pn_bag_v1") || "[]");
      bag[0].unitPrice = 1;
      localStorage.setItem("pn_bag_v1", JSON.stringify(bag));
    });
    await page.goto("/checkout");
    await page.getByLabel("City").selectOption("Lahore");
    await expect(page.getByText("Rs 2,500").first()).toBeVisible();
  });

  test("S8 admin login is rate limited", async ({ page }) => {
    await page.goto("/admin/login");
    for (let i = 0; i < 7; i++) {
      await page.getByLabel("Email", { exact: true }).fill("bruteforce@phalnama.test");
      await page.getByLabel("Password", { exact: true }).fill(`wrong-${i}`);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(alertBox(page)).toBeVisible();
    }
    await expect(alertBox(page)).toContainText("Too many attempts");
  });

  test("S9 SQL-injection style input is treated as data", async ({ page }) => {
    const r = await page.request.get(`/api/search?q=${encodeURIComponent("' OR 1=1; DROP TABLE \"Order\"; --")}`);
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ products: [], articles: [] });
    const t = await page.request.get(`/track?order=${encodeURIComponent("' OR '1'='1")}&phone=03001234567`);
    expect(t.status()).toBe(200);
  });
});
