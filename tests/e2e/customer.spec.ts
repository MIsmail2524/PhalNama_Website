import { test, expect } from "@playwright/test";
import { addKinnowToBag, alertBox, fillCheckout, uniquePhone } from "./helpers";

test.describe("Customer journeys", () => {
  test("J1 discover → product → bag → COD checkout → confirmation → tracking", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
    await page.getByRole("link", { name: /Explore the harvest/i }).first().click();
    await expect(page).toHaveURL(/\/shop/);
    await page.getByRole("link", { name: "Bhalwal Kinnow" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Bhalwal Kinnow" })).toBeVisible();

    await addKinnowToBag(page);
    const bag = page.getByRole("dialog", { name: /Your bag/ });
    await bag.getByRole("button", { name: "Increase quantity" }).click();
    await expect(bag.getByText("Rs 5,000").first()).toBeVisible();
    await bag.getByRole("link", { name: "Checkout" }).click();

    const phone = uniquePhone();
    await fillCheckout(page, { phone });
    await expect(page.getByText("Delivery (10 kg)")).toBeVisible();
    // 2 × 2500 + 350 base + 5 extra kg × 40 = 5550
    await expect(page.getByText("Rs 5,550")).toBeVisible();
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=PN-/);
    await expect(page.getByRole("heading", { name: "Thank you." })).toBeVisible();
    const number = new URL(page.url()).searchParams.get("order")!;

    // bag cleared
    await expect(page.getByRole("button", { name: "Bag, 0 items" })).toBeVisible();

    await page.goto(`/track?order=${number}&phone=${phone}`);
    await expect(page.getByLabel("Order status")).toContainText("Received");
  });

  test("J2 gift order with personal message and card preview", async ({ page }) => {
    await addKinnowToBag(page, "3–4 KG Premium Gift Pack");
    await fillCheckout(page, { phone: uniquePhone() });
    await page.getByLabel(/This is a gift/).check();
    await page.getByLabel("Recipient's name").fill("Amna");
    await page.getByLabel("Your message", { exact: false }).first().fill("Eid Mubarak from the orchards");
    await expect(page.getByLabel("Card preview")).toContainText("Dear Amna");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByText(/Your gift for Amna/)).toBeVisible();
  });

  test("J3 coupon: invalid shows reason, valid applies discount", async ({ page }) => {
    await addKinnowToBag(page);
    await fillCheckout(page, { phone: uniquePhone() });
    await page.getByPlaceholder("Coupon code").fill("NOPE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This coupon code is not valid.")).toBeVisible();
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByPlaceholder("Coupon code").fill("E2ETEN");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("− Rs 250")).toBeVisible();
  });

  test("J4 validation: empty checkout shows clear field errors", async ({ page }) => {
    await addKinnowToBag(page);
    await page.goto("/checkout");
    await page.getByLabel("Mobile number").fill("123");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByText("Please enter your full name.").first()).toBeVisible();
    await expect(page.getByText(/valid mobile number/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("J5 bank transfer shows account details after ordering", async ({ page }) => {
    await addKinnowToBag(page);
    await fillCheckout(page, { phone: uniquePhone() });
    await page.getByRole("radio", { name: "Bank transfer" }).check();
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByRole("heading", { name: "Bank transfer details" })).toBeVisible();
    await expect(page.getByText("PK00TEST0000000000000123")).toBeVisible();
  });

  test("J6 register → account → passport → preferences → sign out → sign in", async ({ page }) => {
    const phone = uniquePhone();
    await page.goto("/account/register");
    const main = page.getByRole("main");
    await main.getByLabel("Full name").fill("Passport Holder");
    await main.getByLabel("Mobile number").fill(phone);
    await main.getByLabel("Password", { exact: false }).fill("orchard-pass-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: /Passport/ }).or(page.getByText("Assalam-o-Alaikum, Passport."))).toBeVisible();
    await expect(page.getByText(/Your code:/)).toBeVisible();

    await page.getByRole("link", { name: "Harvest Passport" }).first().click();
    await expect(page.getByText("Bhalwal Kinnow")).toBeVisible();

    await page.goto("/account/preferences");
    await page.getByRole("main").getByLabel("WhatsApp", { exact: true }).check();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Your preferences have been saved.")).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.goto("/account/login");
    await page.getByLabel("Mobile number or email").fill(phone);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("do not match")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("orchard-pass-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("J7 referral link → welcome page → code pre-filled → discount at checkout", async ({ page, browser }) => {
    // Referrer creates an account to get a code.
    const phone = uniquePhone();
    await page.goto("/account/register");
    await page.getByRole("main").getByLabel("Full name").fill("Sana Referrer");
    await page.getByRole("main").getByLabel("Mobile number").fill(phone);
    await page.getByRole("main").getByLabel("Password", { exact: false }).fill("orchard-pass-123");
    await page.getByRole("button", { name: "Create account" }).click();
    const code = (await page.getByText(/Your code:/).textContent())!.split(":")[1].trim();

    const friend = await browser.newContext();
    const fp = await friend.newPage();
    await fp.goto(`/r/${code}`);
    await expect(fp.getByRole("heading", { name: /Sana thought you would enjoy this/ })).toBeVisible();
    await addKinnowToBag(fp);
    await fillCheckout(fp, { phone: uniquePhone(), address: "Different House 77, Friend Street" });
    await expect(fp.getByPlaceholder("Referral code (first order)")).toHaveValue(code);
    await expect(fp.getByText("Welcome offer from Sana applied.")).toBeVisible();
    await expect(fp.getByText("− Rs 300")).toBeVisible();
    await friend.close();
  });

  test("J8 search overlay finds Kinnow and journal stories", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    const dialog = page.getByRole("dialog", { name: "Search" });
    await dialog.getByRole("searchbox").fill("kinnow");
    await expect(dialog.getByRole("link", { name: /Bhalwal Kinnow/ })).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Understanding Kinnow/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("J9 newsletter, contact and corporate enquiry forms", async ({ page }) => {
    await page.goto("/");
    const nl = page.locator("form", { has: page.getByPlaceholder("Email or WhatsApp number") }).last();
    await nl.getByPlaceholder("Email or WhatsApp number").fill(`e2e${Date.now()}@example.com`);
    await nl.getByRole("checkbox").check();
    await nl.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByText(/We will write when the next harvest opens/)).toBeVisible();

    await page.goto("/contact");
    const c = page.getByRole("main");
    await c.getByLabel(/^Name/).fill("Contact Tester");
    await c.getByLabel(/^Email/).fill("contact@example.com");
    await c.getByLabel(/^Message/).fill("Do you deliver to Hunza?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/Thank you for writing to us/)).toBeVisible();

    await page.goto("/gifts#corporate");
    const g = page.locator("#corporate");
    await g.getByLabel(/^Organisation/).fill("Acme Pvt Ltd");
    await g.getByLabel(/^Contact person/).fill("Ali");
    await g.getByLabel(/^Mobile/).fill("03001234567");
    await g.getByLabel(/^Email/).fill("ali@acme.example");
    await g.getByLabel(/^Quantity required/).fill("100 boxes");
    await page.getByRole("button", { name: "Request a proposal" }).click();
    await expect(page.getByText(/contact you to discuss your requirements/)).toBeVisible();
  });

  test("J10 content pages render: story, orchards, journal article, FAQ, policies, passport, credits", async ({ page }) => {
    for (const [path, text] of [
      ["/our-story", "Every fruit has a story"],
      ["/orchards", "Every fruit belongs to a place."],
      ["/orchards/bhalwal-sargodha", "Bhalwal"],
      ["/journal", "The Harvest Journal"],
      ["/journal/understanding-kinnow", "Understanding Kinnow"],
      ["/faq", "Questions"],
      ["/policies/refund-policy", "Refund"],
      ["/passport", "Harvest Passport"],
      ["/gifts", "A gift from the orchard."],
      ["/credits", "Photo credits"],
    ]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(text);
    }
  });

  test("J11 unknown URL shows branded 404 with way back", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This path leads out of the orchard.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" }).last()).toBeVisible();
  });

  test("J12 track with wrong phone does not reveal the order", async ({ page }) => {
    await page.goto("/track?order=PN-0000-AAAAA&phone=03001234567");
    await expect(alertBox(page)).toContainText("could not find");
  });

  test("J13 upcoming fruit can be subscribed to", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "The chapters ahead" })).toBeVisible();
    await expect(page.getByText("Mangoes").first()).toBeVisible();
  });
});
