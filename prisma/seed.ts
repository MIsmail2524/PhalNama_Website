/**
 * Seeds the catalogue structure and editorial content.
 * It deliberately does NOT invent prices, stock, harvest dates, reviews or
 * delivery charges — those are set by the team in the admin dashboard.
 *
 * Safe to re-run: everything is upserted by slug/code.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ── Categories ───────────────────────────────────
  const categories = [
    { slug: "kinnow", name: "Kinnow", nameUrdu: "کینو", season: "December – March", status: "ACTIVE" as const, sortOrder: 1,
      tagline: "The winter citrus of Sargodha",
      description: "Bright, juicy mandarins from the orchards of Bhalwal — the fruit we know best, and the first chapter of Phalnama." },
    { slug: "mangoes", name: "Mangoes", nameUrdu: "آم", season: "Summer", status: "UPCOMING" as const, sortOrder: 2,
      tagline: "The summer harvest", description: "Seasonal mangoes from the orchards of southern Punjab and Sindh." },
    { slug: "guavas", name: "Guavas", nameUrdu: "امرود", season: "Autumn – Winter", status: "UPCOMING" as const, sortOrder: 3,
      tagline: "Fragrant and familiar", description: "Guavas from Punjab's orchard country." },
    { slug: "peaches", name: "Peaches", nameUrdu: "آڑو", season: "Early summer", status: "UPCOMING" as const, sortOrder: 4,
      tagline: "From the valleys", description: "Stone fruit from Pakistan's cooler valleys." },
    { slug: "apples", name: "Apples", nameUrdu: "سیب", season: "Autumn", status: "UPCOMING" as const, sortOrder: 5,
      tagline: "The northern harvest", description: "Apples from the northern regions of Pakistan." },
    { slug: "dates", name: "Dates", nameUrdu: "کھجور", season: "Late summer", status: "UPCOMING" as const, sortOrder: 6,
      tagline: "From the date palms", description: "Dates from Pakistan's date-growing regions." },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }
  const kinnow = await prisma.category.findUniqueOrThrow({ where: { slug: "kinnow" } });
  const mangoes = await prisma.category.findUniqueOrThrow({ where: { slug: "mangoes" } });

  // ── Origin ───────────────────────────────────────
  const bhalwal = await prisma.origin.upsert({
    where: { slug: "bhalwal-sargodha" },
    update: {},
    create: {
      slug: "bhalwal-sargodha",
      name: "Bhalwal",
      region: "Sargodha, Punjab",
      location: "Bhalwal, District Sargodha, Punjab, Pakistan",
      varieties: "Kinnow mandarin",
      season: "December – March",
      summary: "The citrus heartland of Pakistan, where our own Kinnow orchards grow.",
      story:
        "Sargodha district is the centre of Pakistan's citrus country, and Bhalwal sits at its heart. The plains between the Jhelum and Chenab rivers, the cold winter nights and the warm winter sun give Kinnow the conditions it loves.\n\nOur family's orchards are here. This is where Phalnama begins — on our own trees, with fruit we have watched grow through the season.\n\n*Photographs and orchard details on this page will be updated with images from our own orchards.*",
      harvestInfo:
        "Kinnow is a winter fruit. Harvest in the Sargodha region usually runs through the winter months, with the exact timing depending on the season. We open orders when our fruit is ready.",
      sortOrder: 1,
    },
  });

  // ── Product (no prices, no stock — set them in the dashboard) ──
  const product = await prisma.product.upsert({
    where: { slug: "bhalwal-kinnow" },
    update: {},
    create: {
      slug: "bhalwal-kinnow",
      name: "Bhalwal Kinnow",
      categoryId: kinnow.id,
      originId: bhalwal.id,
      status: "ACTIVE",
      featured: true,
      giftable: true,
      shortDescription: "Hand-selected Kinnow from our own orchards in Bhalwal, Sargodha.",
      description:
        "Kinnow is the winter citrus of Punjab — easy to peel, generous with juice and bright with a balance of sweetness and tang.\n\nOur Kinnow is grown in our own orchards in Bhalwal and picked when it is ready. Every lot is sorted and graded before packing, and every carton carries a batch code you can scan to see where and when your fruit was harvested and packed.",
      selectionInfo:
        "Fruit is sorted by hand after harvest. Only fruit that meets our selection for size, skin and condition is packed under the Phalnama name. The selection grade of each batch is recorded on its traceability page.",
      deliveryInfo:
        "Delivery times and charges depend on your city and are shown at checkout. We will confirm your order by phone or WhatsApp before dispatch.",
      variationNote:
        "Kinnow is a natural fruit. Size, shape, skin colour and taste vary slightly from fruit to fruit and through the season — this is part of its character.",
      seoTitle: "Buy Kinnow Online — Selected Bhalwal Kinnow from Sargodha",
      seoDescription:
        "Hand-selected Kinnow from our own orchards in Bhalwal, Sargodha. Family cartons and gift boxes delivered across Pakistan.",
      sortOrder: 1,
      variants: {
        create: [
          { name: "5 KG Family Pack", sku: "KIN-5KG", netWeightKg: 5, packaging: "Family carton", sortOrder: 1,
            description: "Everyday freshness for the household." },
          { name: "10 KG Signature Pack", sku: "KIN-10KG", netWeightKg: 10, packaging: "Signature carton", sortOrder: 2,
            description: "Our flagship carton for larger families." },
          { name: "3–4 KG Premium Gift Pack", sku: "KIN-GIFT", netWeightKg: 3.5, packaging: "Orchard gift box", isGiftPack: true, sortOrder: 3,
            description: "A rigid presentation box with tissue, sleeve and a personal message card." },
        ],
      },
    },
  });

  // ── Harvest Passport ─────────────────────────────
  await prisma.passportChapter.upsert({
    where: { number: 1 },
    update: {},
    create: { number: 1, title: "Bhalwal Kinnow", subtitle: "Sargodha, Punjab", season: "Winter", categoryId: kinnow.id, originId: bhalwal.id,
      description: "The first chapter — winter citrus from our own orchards." },
  });
  await prisma.passportChapter.upsert({
    where: { number: 2 },
    update: {},
    create: { number: 2, title: "Summer Mangoes", subtitle: "Coming in a future season", season: "Summer", categoryId: mangoes.id,
      description: "A future harvest. This chapter unlocks when mangoes join Phalnama." },
  });

  const tiers = [
    { name: "Harvest Member", minOrders: 0, sortOrder: 1, description: "Every Phalnama customer starts here.", benefits: "Harvest Passport\nSeasonal updates (if you choose)" },
    { name: "Orchard Member", minOrders: 3, sortOrder: 2, description: "For returning families.", benefits: "Benefits to be announced" },
    { name: "Phalnama Circle", minOrders: 6, sortOrder: 3, description: "Our closest customers.", benefits: "Benefits to be announced" },
  ];
  if ((await prisma.loyaltyTier.count()) === 0) await prisma.loyaltyTier.createMany({ data: tiers });

  // ── Delivery zone (charges must be set by the team) ──
  if ((await prisma.deliveryZone.count()) === 0) {
    await prisma.deliveryZone.create({
      data: { name: "All Pakistan", isDefault: true, baseFee: 0, etaText: "Delivery time confirmed when we call you", sortOrder: 1 },
    });
  }

  // ── FAQs ─────────────────────────────────────────
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({
      data: [
        { group: "Orders", sortOrder: 1, question: "How do I know my order is confirmed?",
          answer: "After you place an order we call or message you on WhatsApp to confirm the details. You can also check its status any time on the Track Order page using your order number and mobile number." },
        { group: "Orders", sortOrder: 2, question: "Which cities do you deliver to?",
          answer: "Available cities are shown at checkout. If your city is not listed, message us on WhatsApp and we will tell you what is possible." },
        { group: "Fruit", sortOrder: 3, question: "Will every fruit look the same?",
          answer: "No. Kinnow is a natural fruit, and size, shape and skin vary slightly. We select every lot carefully, but we do not wax or artificially colour our fruit to make it look uniform." },
        { group: "Fruit", sortOrder: 4, question: "How should I store Kinnow?",
          answer: "Keep the carton open in a cool, airy place away from direct sun, or refrigerate the fruit. Check the carton when it arrives and set aside any fruit that is bruised." },
        { group: "Fruit", sortOrder: 5, question: "What is the batch code on my carton?",
          answer: "Every packed batch has its own code and QR. Scan it to see the details recorded for that batch — where it was harvested, when it was packed and its selection grade." },
        { group: "Gifting", sortOrder: 6, question: "Can I send fruit as a gift?",
          answer: "Yes. Choose \"This is a gift\" at checkout, enter the recipient's details and your message, and we will include a personal card in the box." },
        { group: "Returns", sortOrder: 7, question: "What if something is wrong with my order?",
          answer: "Message us on WhatsApp within 24 hours of delivery with your order number and a photo. Please see our Refund & Replacement Policy for details." },
      ],
    });
  }

  // ── Policy & story pages ─────────────────────────
  const pages = [
    { slug: "our-story", title: "Our Story", excerpt: "Every fruit has a story. Ours begins in Bhalwal.",
      body: "## Every fruit has a story\n\nPakistan grows some of the most remarkable fruit in the world. Each one belongs to a region, a season and the families who grow it — Kinnow from Sargodha, mangoes from Multan and Sindh, apples from the northern valleys, dates from Khairpur.\n\nToo often, that story is lost on the way to the market. Fruit changes hands many times before it reaches a home, and by the time it arrives, nobody knows where it came from or who grew it.\n\n## Why we started Phalnama\n\nPhalnama means *the book of fruit*. We started it in our own Kinnow orchards in Bhalwal, with a simple idea: carefully selected fruit should be easy to bring home, and it should arrive with its story intact.\n\nWe select our fruit by hand, pack it with care and send it directly to your door. Every carton carries a batch code, so you can see where and when your fruit was harvested and packed.\n\n## What we believe\n\n- **Respect for the season.** Fruit is best in its own season. We sell it when it is ready, not before.\n- **Respect for growers.** Good fruit is the result of years of work by the people who tend the orchards.\n- **Selection matters.** What goes into a carton matters more than what is printed on it.\n- **Honesty.** We tell you what we know about your fruit, and nothing we do not.\n\n## The chapters ahead\n\nWe begin with Kinnow — the fruit we know best. In future seasons we hope to bring you fruit from other regions of Pakistan, working with growers who share our care for selection. Each harvest will be a new chapter." },
    { slug: "shipping-policy", title: "Shipping Policy", excerpt: "How and where we deliver.",
      body: "## Delivery areas\n\nThe cities we currently deliver to are shown at checkout. Delivery charges depend on your city and the weight of your order and are always shown before you place your order.\n\n## Order confirmation\n\nWe confirm every order by phone or WhatsApp before dispatch.\n\n## Delivery times\n\nFruit is packed after your order is confirmed. Estimated delivery times are shown at checkout and confirmed when we contact you.\n\n## Receiving your order\n\nPlease check your carton when it arrives. If anything is wrong, contact us within 24 hours with your order number and photographs.\n\n*This policy is a template and should be reviewed by the Phalnama team before launch.*" },
    { slug: "refund-policy", title: "Refund & Replacement Policy", excerpt: "What happens if something is not right.",
      body: "## Our commitment\n\nFruit is natural and perishable. We select and pack it carefully, and if something is not right when it reaches you, we want to know.\n\n## Reporting a problem\n\nContact us within 24 hours of delivery with your order number and clear photographs of the carton and fruit.\n\n## Resolution\n\nDepending on the issue, we may offer a replacement, partial refund, full refund or store credit. Natural variation in size, shape and skin is not considered a defect.\n\n## Refunds\n\nApproved refunds are made to the original payment method or by bank transfer for cash-on-delivery orders.\n\n*This policy is a template and should be reviewed by the Phalnama team before launch.*" },
    { slug: "privacy-policy", title: "Privacy Policy", excerpt: "How we handle your information.",
      body: "## What we collect\n\nWhen you order, we collect your name, mobile number, delivery address and, optionally, your email address. For gifts, we collect the recipient's name, address and phone number.\n\n## How we use it\n\nWe use your information to process and deliver your order, contact you about it, and — only if you have agreed — to send seasonal updates.\n\n## Marketing\n\nWe only send marketing messages if you have opted in. You can unsubscribe at any time from your account or through the link in every message.\n\n## Cookies and analytics\n\nWe use essential cookies to keep your bag and account working. Analytics and advertising cookies are only used if you accept them.\n\n## Sharing\n\nWe share delivery details with our courier partners only to deliver your order. We do not sell your information.\n\n## Contact\n\nTo access or delete your information, contact us.\n\n*This policy is a template and should be reviewed by the Phalnama team before launch.*" },
    { slug: "terms", title: "Terms & Conditions", excerpt: "The terms of using this website.",
      body: "## Orders\n\nPlacing an order is an offer to buy. An order is accepted when we confirm it. Prices are in Pakistani Rupees and are shown at checkout.\n\n## Availability\n\nFruit is seasonal and available in limited quantities. If we cannot fulfil an order, we will contact you and refund any payment made.\n\n## Natural products\n\nFruit varies naturally in size, shape, colour and taste.\n\n## Referral and loyalty credit\n\nReferral and loyalty credit has no cash value, may expire, and may be withdrawn if it was obtained through misuse.\n\n*These terms are a template and should be reviewed by the Phalnama team before launch.*" },
  ];
  for (const p of pages) await prisma.page.upsert({ where: { slug: p.slug }, create: p, update: {} });

  // ── Harvest Journal ──────────────────────────────
  const articles = [
    { slug: "understanding-kinnow", title: "Understanding Kinnow", category: "Understanding Fruit",
      excerpt: "Where Pakistan's favourite winter citrus came from, and what makes it special.",
      body: "Kinnow is a mandarin hybrid — a cross between the 'King' and 'Willow Leaf' mandarins. It was developed in California in the early twentieth century and introduced to Punjab, where it found a second home.\n\n## Why Punjab suits Kinnow\n\nThe plains of central Punjab, and Sargodha district in particular, offer what Kinnow enjoys: warm days, cold winter nights and fertile soil. Over the decades Sargodha has become the centre of Pakistan's citrus country.\n\n## What to look for\n\n- **Weight.** A good Kinnow feels heavy for its size — a sign of juice.\n- **Skin.** A thin, glossy, loose skin that peels easily.\n- **Natural variation.** Colour and size vary across the season. A small green patch does not mean the fruit is not ready.\n\n## Enjoying it\n\nKinnow is at its best peeled and eaten fresh, or juiced. Keep fruit in a cool, airy place, or refrigerate it.",
      seoDescription: "What Kinnow is, where it came from and why the orchards of Sargodha suit it so well." },
    { slug: "bhalwal-and-its-orchards", title: "Bhalwal and its Orchards", category: "From the Orchards",
      excerpt: "An introduction to the town at the centre of our story.",
      body: "Bhalwal is a town in Sargodha district, in the heart of Punjab's citrus belt. Drive through it in winter and the roads are lined with orchards heavy with fruit.\n\n## Our orchards\n\nOur family's Kinnow orchards are here. This is where we grow, select and pack the fruit that goes into every Phalnama carton.\n\n## The season\n\nKinnow ripens through the winter. The exact timing changes from year to year, depending on the weather. We open orders when our fruit is ready, and we will share each season's harvest here in the Journal.\n\n*We will add photographs from our own orchards to this story.*",
      seoDescription: "Bhalwal, Sargodha — the town at the heart of Pakistan's Kinnow country and home to the Phalnama orchards." },
    { slug: "how-we-select-our-fruit", title: "How We Select Our Fruit", category: "Behind the Packaging",
      excerpt: "Selection is the most important thing we do. Here is how it works.",
      body: "Every Phalnama carton begins with a decision: does this fruit belong here?\n\n## After the harvest\n\nFruit is picked by hand and brought from the orchard for sorting. It is checked for size, skin condition and damage.\n\n## Grading\n\nSelected fruit is graded, and each packed batch records its grade. You can see it by scanning the QR code on your carton.\n\n## Packing\n\nFruit is packed into ventilated cartons with protective inserts. Gift boxes add tissue wrap, a sleeve and a personal message card.\n\n## What we will not do\n\nWe will not promise that every fruit is identical. Fruit is natural, and a little variation is part of its character.",
      seoDescription: "How Phalnama sorts, grades and packs its Kinnow, and how each batch is recorded for traceability." },
  ];
  for (const a of articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, status: "PUBLISHED", publishedAt: new Date(), relatedProducts: { connect: [{ id: product.id }] } },
    });
  }

  // ── First admin ──────────────────────────────────
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
    const exists = await prisma.adminUser.findUnique({ where: { email } });
    if (!exists) {
      await prisma.adminUser.create({
        data: { email, name: process.env.SEED_ADMIN_NAME || "Owner", role: "OWNER", passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log(`Created owner admin ${email}`);
    }
  } else {
    console.log("No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD set — run `npm run admin:create` to add the first admin.");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
