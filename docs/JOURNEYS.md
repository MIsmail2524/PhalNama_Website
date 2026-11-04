# User journey maps

Every journey below has an automated end-to-end test (`tests/e2e/*.spec.ts`) that runs in CI on each push.
"Pain points found" lists problems discovered while walking the journey and how they were fixed.

## Customers

| # | Journey | Steps | Test | Pain points found → fix |
|---|---------|-------|------|--------------------------|
| J1 | First purchase (cash on delivery) | Home → Explore the harvest → Product → choose pack → Add to bag → adjust quantity → Checkout → details → live total → Place order → Thank you → Track | `customer.spec.ts` J1 | Ordering more than stock silently reduced quantity → order now blocked with a clear message and an **Edit bag** button at checkout |
| J2 | Send a gift | Gift pack → Checkout → "This is a gift" → recipient + message → live card preview → order | J2 | No preview of what the card says → added live card preview |
| J3 | Use a coupon | Checkout → enter code → Apply → see reason or discount | J3 | After an invalid code the Apply button disappeared → stays until a valid code is applied; Enter key applies |
| J4 | Fix form mistakes | Submit incomplete checkout → field errors + focus moves to first error | J4 | — |
| J5 | Pay by bank transfer | Choose bank transfer → order → account details + reference shown | J5 | — |
| J6 | Create account & passport | Register → account dashboard → Harvest Passport → preferences → sign out → wrong password → sign in | J6 | Successful logins counted toward lockout → only failed attempts count now. After a wrong password the form wiped the phone number (React 19 form reset) → every form now keeps what was typed |
| J7 | Referred by a friend | Friend's `/r/CODE` link → personalised welcome → shop → code pre-filled → discount applied | J7 | — |
| J8 | Search | Search icon → type → products + stories → Escape closes, focus returns | J8 | Search dialog did not trap focus → shared accessible dialog hook |
| J9 | Contact / corporate / newsletter | Forms with consent, honeypot and confirmation | J9 | — |
| J10 | Read the story | Our Story, Orchards, Journal, FAQ, policies, Passport, Gifts, Photo credits | J10 | Stock photos could be mistaken for our farms → "Representative photo" labels + credits page |
| J11 | Lost on a bad URL | Branded 404 with links home and to the harvest | J11 | Unknown URLs lost header/footer and returned HTTP 200 (bad for SEO) → proper 404 with site layout |
| J12 | Track an order | Order number **and** phone required; wrong phone reveals nothing | J12, J1 | — |
| J13 | Wait for upcoming fruit | Shop → "The chapters ahead" → subscribe | J13 | — |
| M  | Mobile shopping | No sideways scroll on 10 key pages, sticky add-to-bag, 44px touch targets, menu focus trap | `mobile.spec.ts` | Header icons were 36px → 44px; two logos showed on phones; product photo thumbnails pushed the page 65px wider than the phone → all fixed |

## Team (admin at `/admin`, also linked as **Team login** in the footer)

| # | Journey | Test | Pain points found → fix |
|---|---------|------|--------------------------|
| A1 | Find the admin portal and sign in | `admin.spec.ts` A1 | Portal had no visible entry point → footer **Team login** link |
| A2 | Process an order: find → change status → add note → customer sees new status | A2 | — |
| A3 | Launch a new fruit: category → product with pack, price, stock → live in shop | A3 | Leaving optional number fields empty crashed the save → empty now keeps the default; admin labels linked to inputs |
| A4 | Edit homepage copy | A4 | Leaving with unsaved edits lost them → browser warns before leaving |
| A5 | Record a harvest batch → QR → public trace page shows only recorded facts | A5 | — |
| A6 | Create a discount code and see it work at checkout | A6 | — |
| A7 | Export orders to CSV | A7 | Exported cells could run spreadsheet formulas → neutralised |
| A8 | Role limits (editor cannot see orders/settings/team) | A8 | — |
| A9 | Sign out ends the session | A9 | — |

## Usability principles applied (Nielsen heuristics & WCAG 2.2 AA)

- **Visibility of system status** – live harvest status strip, live checkout totals, loading skeletons, toasts after admin saves, `aria-live` search results.
- **Match with the real world** – PKR, Pakistani phone formats, city list, "Assalam-o-Alaikum", Urdu names.
- **User control & freedom** – Edit bag from checkout, remove items, Escape closes every dialog, cookie choices can be changed any time.
- **Consistency** – one design system for buttons, inputs, dialogs; same dialog behaviour everywhere.
- **Error prevention** – server-side validation, stock checks, unsaved-change warnings, confirmation on destructive admin actions.
- **Recognition over recall** – previous address pre-filled for signed-in customers, card preview for gifts, breadcrumbs.
- **Flexibility** – guest checkout or account, WhatsApp button, search.
- **Aesthetic & minimal design** – editorial layout, no fake urgency or fake reviews.
- **Help users recover from errors** – plain-language messages next to fields, error pages with "Try again".
- **Accessibility** – skip link, focus trapping/return, 44px targets, linked labels, reduced-motion support, axe checks in CI with zero serious violations allowed.

## Latest CI result

All checks green: dependency audit (0 vulnerabilities), typecheck, lint, 18 unit tests, 11 integration tests, production build, and 66 Playwright tests (desktop + Pixel 7 phone; 3 phone-only tests skipped on desktop by design). Colour contrast meets WCAG AA (axe: 0 serious issues).
