import { cache } from "react";
import { prisma } from "./db";

/**
 * All business-editable configuration lives here, stored in the Setting table
 * under one key per group. Defaults are used until the admin saves a group.
 * Nothing here should contain invented business facts (prices, dates, claims).
 */

export type BrandSettings = {
  name: string;
  nameUrdu: string;
  tagline: string;
  showTagline: boolean;
  description: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  supportHours: string;
};

export type HomeSettings = {
  heroEyebrow: string;
  heroHeadline: string;
  heroSubtext: string;
  heroImage: string;
  /** Extra hero photographs; the hero cross-fades between them */
  heroGallery: string[];
  heroPrimaryLabel: string;
  heroPrimaryHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  harvestHeading: string;
  harvestIntro: string;
  journeyHeading: string;
  journeyIntro: string;
  journeySteps: { title: string; body: string; image: string }[];
  differenceHeading: string;
  differencePoints: { title: string; body: string }[];
  experienceHeading: string;
  experienceIntro: string;
  experienceImage: string;
  packaging: { title: string; body: string; image: string }[];
  philosophyHeading: string;
  philosophyBody: string;
  philosophyImage: string;
  reviewsHeading: string;
  journalHeading: string;
  newsletterHeading: string;
  newsletterBody: string;
};

export type LoyaltySettings = {
  enabled: boolean;
  programmeName: string;
  /** Delivered orders with at least this subtotal count towards rewards */
  qualifyingMinSubtotal: number;
  /** Every N qualifying orders unlock a reward */
  ordersPerReward: number;
  /** PKR credited per milestone. 0 = milestones tracked but no credit given */
  rewardAmount: number;
  rewardExpiryDays: number;
  /** Max share of the subtotal that rewards may cover (0–100) */
  maxRedemptionPercent: number;
};

export type ReferralSettings = {
  enabled: boolean;
  campaignName: string;
  headline: string;
  body: string;
  /** Discount for the friend on their first order */
  refereeDiscountType: "PERCENT" | "FIXED";
  refereeDiscountValue: number;
  refereeMaxDiscount: number;
  /** Credit for the referrer once the friend's order is delivered and validated */
  referrerReward: number;
  minOrderSubtotal: number;
  validationDays: number;
  rewardExpiryDays: number;
  /** Max rewarded referrals per referrer per calendar year (0 = unlimited) */
  maxRewardsPerYear: number;
};

export type PaymentSettings = {
  codEnabled: boolean;
  codNote: string;
  bankEnabled: boolean;
  bankInstructions: string;
  bankAccounts: { bank: string; title: string; account: string; iban: string }[];
  onlineEnabled: boolean;
  onlineLabel: string;
};

export type CheckoutSettings = {
  allowGuestCheckout: boolean;
  giftPresentations: string[];
  giftMessageMaxLength: number;
  orderPrefix: string;
  cities: string[];
};

export type TrackingSettings = {
  googleAnalyticsId: string;
  metaPixelId: string;
  googleSiteVerification: string;
};

export type SettingsMap = {
  brand: BrandSettings;
  home: HomeSettings;
  loyalty: LoyaltySettings;
  referral: ReferralSettings;
  payments: PaymentSettings;
  checkout: CheckoutSettings;
  tracking: TrackingSettings;
};

export const DEFAULT_SETTINGS: SettingsMap = {
  brand: {
    name: "Phalnama",
    nameUrdu: "پھل نامہ",
    tagline: "A Story in Every Season",
    showTagline: true,
    description:
      "Carefully selected seasonal fruit from Pakistani orchards, packed with care and delivered to your home.",
    email: "",
    phone: "",
    whatsapp: "",
    address: "Bhalwal, District Sargodha, Punjab, Pakistan",
    instagram: "",
    facebook: "",
    tiktok: "",
    supportHours: "",
  },
  home: {
    heroEyebrow: "From the orchards of Bhalwal",
    heroHeadline: "Some stories begin in an orchard.",
    heroSubtext:
      "From the orchards of Bhalwal to the homes of those who appreciate the goodness of carefully selected fruit.",
    heroImage: "/images/photos/tree-ripe-oranges.jpg",
    heroGallery: ["/images/photos/orchard-three-oranges.jpg", "/images/photos/mandarin-tree-sky.jpg"],
    heroPrimaryLabel: "Explore the harvest",
    heroPrimaryHref: "/shop",
    heroSecondaryLabel: "Our story",
    heroSecondaryHref: "/our-story",
    harvestHeading: "The Current Harvest",
    harvestIntro:
      "This season's collection, selected by hand in our Bhalwal orchards and packed for homes across Pakistan.",
    journeyHeading: "From our orchards",
    journeyIntro: "Every carton begins on a tree. Here is the path it takes before it reaches your table.",
    journeySteps: [
      { title: "On the tree", body: "Kinnow ripens slowly through the Punjab winter, on trees tended season after season.", image: "/images/photos/oranges-branch.jpg" },
      { title: "The harvest", body: "Fruit is picked by hand when it is ready, not before, and handled gently from branch to crate.", image: "/images/photos/basket-oranges.jpg" },
      { title: "Selection", body: "Each lot is sorted and graded. Fruit that does not meet our selection does not go into a Phalnama carton.", image: "/images/photos/mandarins-closeup.jpg" },
      { title: "Packing", body: "Selected fruit is packed into ventilated cartons, each carrying a batch code you can trace.", image: "/images/photos/crate-citrus.jpg" },
      { title: "To your home", body: "Cartons leave the orchard and travel to homes across Pakistan, with updates along the way.", image: "/images/photos/hand-orange.jpg" },
    ],
    differenceHeading: "What makes Phalnama different",
    differencePoints: [
      { title: "Carefully selected", body: "Fruit is sorted and graded before it is packed. Selection is the heart of what we do." },
      { title: "Transparent origin", body: "Every carton carries a batch code. Scan it to see where and when your fruit was harvested and packed." },
      { title: "Packed with care", body: "Ventilated cartons, protective inserts and tissue wrap help fruit travel well." },
      { title: "Thoughtfully presented", body: "Cartons designed for the family table and gift boxes designed to be given." },
      { title: "A direct relationship", body: "You buy from the people who grow and select the fruit, and you can always reach us directly." },
    ],
    experienceHeading: "The Phalnama experience",
    experienceIntro:
      "Packaging is where the orchard meets your home. Each format is designed for how it will be used — on the family table, or as a gift.",
    experienceImage: "/images/packaging/unboxing-system.jpg",
    packaging: [
      { title: "Family carton", body: "Everyday freshness for the household — sturdy, ventilated and easy to carry.", image: "/images/packaging/carton-5kg.jpg" },
      { title: "Signature carton", body: "Our larger flagship pack for families who go through fruit quickly.", image: "/images/packaging/carton-10kg.jpg" },
      { title: "Orchard gift box", body: "A rigid presentation box with tissue, sleeve and ribbon — made to be given.", image: "/images/packaging/gift-box.jpg" },
      { title: "Inside every box", body: "An orchard story card, a batch traceability card and, for gifts, your personal message.", image: "/images/packaging/family-carton.jpg" },
    ],
    philosophyHeading: "Every fruit has a story.",
    philosophyBody:
      "Pakistan grows extraordinary fruit — Kinnow from the orchards of Sargodha, mangoes from Multan and Sindh, apples from the northern valleys, dates from Khairpur. Each one belongs to a place, a season and the families who grow it.\n\nPhalnama began in our own Kinnow orchards in Bhalwal with a simple idea: carefully selected fruit should be easy to bring home, and it should arrive with its story intact. We start with the fruit we know best, and we hope to bring you the harvests of other regions, one season at a time.",
    philosophyImage: "/images/photos/tree-ripe-oranges-2.jpg",
    reviewsHeading: "From our customers",
    journalHeading: "The Harvest Journal",
    newsletterHeading: "Be the first to discover our next harvest.",
    newsletterBody:
      "Seasonal updates only — when a harvest opens, when a new fruit arrives. No daily promotions.",
  },
  loyalty: {
    enabled: true,
    programmeName: "The Phalnama Harvest Passport",
    qualifyingMinSubtotal: 0,
    ordersPerReward: 3,
    rewardAmount: 0,
    rewardExpiryDays: 180,
    maxRedemptionPercent: 50,
  },
  referral: {
    enabled: false,
    campaignName: "Pass the Sweetness",
    headline: "Pass the sweetness.",
    body: "Share Phalnama with someone you care about. They receive a welcome discount on their first order, and you receive credit once their fruit is delivered.",
    refereeDiscountType: "FIXED",
    refereeDiscountValue: 0,
    refereeMaxDiscount: 0,
    referrerReward: 0,
    minOrderSubtotal: 0,
    validationDays: 3,
    rewardExpiryDays: 180,
    maxRewardsPerYear: 10,
  },
  payments: {
    codEnabled: true,
    codNote: "Pay in cash when your fruit arrives.",
    bankEnabled: false,
    bankInstructions:
      "Transfer the order total to the account below and share the receipt on WhatsApp with your order number. We confirm your order once payment is verified.",
    bankAccounts: [],
    onlineEnabled: false,
    onlineLabel: "Card / wallet",
  },
  checkout: {
    allowGuestCheckout: true,
    giftPresentations: ["Signature ribbon & card", "Plain — no branding on the outside"],
    giftMessageMaxLength: 300,
    orderPrefix: "PN",
    cities: [
      "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Faisalabad", "Multan", "Sargodha", "Gujranwala",
      "Sialkot", "Peshawar", "Quetta", "Hyderabad", "Bahawalpur", "Sahiwal", "Jhelum", "Gujrat", "Abbottabad",
    ],
  },
  tracking: {
    googleAnalyticsId: "",
    metaPixelId: "",
    googleSiteVerification: "",
  },
};

export type SettingsKey = keyof SettingsMap;

function merge<T>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  return { ...defaults, ...(stored as Partial<T>) };
}

export const getSetting = cache(async <K extends SettingsKey>(key: K): Promise<SettingsMap[K]> => {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return merge(DEFAULT_SETTINGS[key], row?.value);
  } catch {
    return DEFAULT_SETTINGS[key];
  }
});

export async function saveSetting<K extends SettingsKey>(key: K, value: SettingsMap[K]) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
