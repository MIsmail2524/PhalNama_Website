import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Mobile & accessibility", () => {
  for (const path of ["/", "/shop", "/shop/bhalwal-kinnow", "/checkout", "/our-story", "/gifts", "/journal", "/account/login", "/contact", "/faq"]) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }

  test.describe("phone only", () => {
  test.skip(({ isMobile }) => !isMobile, "phone layout only");

  test("mobile menu opens, traps focus, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Close menu" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("sticky add-to-bag bar appears after scrolling past the buy box", async ({ page }) => {
    await page.goto("/shop/bhalwal-kinnow");
    await page.mouse.wheel(0, 2500);
    await expect(page.locator(".sticky-buy")).toBeVisible();
  });

  test("touch targets in the header are at least 44px", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Open menu", "Search"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  });

  for (const path of ["/", "/shop", "/shop/bhalwal-kinnow", "/checkout", "/account/register", "/contact"]) {
    test(`axe: no serious accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    });
  }
});
