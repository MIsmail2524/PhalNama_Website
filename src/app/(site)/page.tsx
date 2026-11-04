import { safeHref } from "@/lib/safe";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getFeaturedProducts, getCategories } from "@/lib/catalog";
import { ProductCard } from "@/components/shop/ProductCard";
import { SmartImage } from "@/components/ui/SmartImage";
import { OrchardScene } from "@/components/ui/OrchardScene";
import { HeroSlides } from "@/components/ui/HeroSlides";
import { Reveal } from "@/components/ui/Reveal";
import { Paragraphs } from "@/components/ui/Markdown";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { IconArrow, IconBox, IconGift, IconHand, IconPin, IconQr } from "@/components/ui/Icons";
import { formatDate } from "@/lib/format";

export const revalidate = 300;

const DIFF_ICONS = [IconHand, IconPin, IconBox, IconGift, IconQr];

export default async function HomePage() {
  const [home, brand, products, categories, articles, reviews] = await Promise.all([
    getSetting("home"),
    getSetting("brand"),
    getFeaturedProducts(),
    getCategories(),
    prisma.article.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 3 }),
    prisma.review.findMany({ where: { approved: true }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 6 }),
  ]);
  const upcoming = categories.filter((c) => c.status === "UPCOMING");
  const open = categories.filter((c) => c.status === "ACTIVE");
  const [latestBatch, inStock] = await Promise.all([
    prisma.batch.findFirst({ where: { published: true, packingDate: { not: null } }, orderBy: { packingDate: "desc" }, include: { origin: true } }),
    prisma.productVariant.count({ where: { active: true, price: { not: null }, OR: [{ trackStock: false }, { stock: { gt: 0 } }], product: { status: "ACTIVE", category: { status: "ACTIVE" } } } }),
  ]);

  return (
    <>
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative -mt-[72px] flex min-h-[100svh] items-end overflow-hidden bg-forest-950 text-ivory">
        {home.heroImage ? (
          <HeroSlides images={[home.heroImage, ...(home.heroGallery ?? [])].filter(Boolean)} alt="Ripe citrus on the tree" />
        ) : (
          <OrchardScene variant="dusk" className="absolute inset-0 h-full w-full" seed={11} label="Illustration of a Kinnow orchard at sunset" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/95 via-forest-950/40 to-forest-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-forest-950/70 to-transparent" />
        <div className="container-x relative pb-20 pt-40 sm:pb-28">
          <div className="max-w-3xl animate-rise">
            {home.heroEyebrow && <p className="eyebrow !text-gold">{home.heroEyebrow}</p>}
            <h1 className="display-xl mt-5 text-ivory">{home.heroHeadline}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ivory/80 sm:text-lg">{home.heroSubtext}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href={safeHref(home.heroPrimaryHref)} className="btn-citrus">{home.heroPrimaryLabel}</Link>
              <Link href={safeHref(home.heroSecondaryHref)} className="btn-ghost-light">{home.heroSecondaryLabel}</Link>
            </div>
          </div>
          {home.heroImage?.startsWith("/images/photos/") && (
            <Link href="/credits" className="absolute bottom-3 left-5 text-[10px] uppercase tracking-[0.14em] text-ivory/50 hover:text-ivory sm:left-8 lg:left-12">Representative photography</Link>
          )}
          {brand.showTagline && brand.tagline && (
            <p className="absolute bottom-8 right-8 hidden font-display text-lg italic text-gold lg:block">{brand.tagline}</p>
          )}
        </div>
      </section>

      {/* ── Live harvest status ────────────────────────── */}
      <div className="border-b border-sand-300 bg-ivory">
        <div className="container-x flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-[13px]" aria-live="polite">
          <span className="flex items-center gap-2 font-semibold text-forest">
            <span className={`relative flex h-2.5 w-2.5`}>
              {inStock > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-citrus opacity-60 motion-reduce:hidden" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${inStock > 0 ? "bg-citrus" : "bg-sand-300"}`} />
            </span>
            {inStock > 0 ? `${open.map((c) => c.name).join(" & ")} harvest is open` : "Orders open with the next harvest"}
          </span>
          {open[0]?.season && <span className="text-stone">Season: {open[0].season}</span>}
          {latestBatch?.packingDate && (
            <Link href={`/trace/${latestBatch.code}`} className="text-stone hover:text-forest">
              Latest batch packed {formatDate(latestBatch.packingDate, { day: "numeric", month: "long" })}{latestBatch.origin ? ` in ${latestBatch.origin.name}` : ""} →
            </Link>
          )}
        </div>
      </div>

      {/* ── Current harvest ────────────────────────────── */}
      <section className="py-24 sm:py-32" aria-labelledby="harvest-h">
        <div className="container-x">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <p className="eyebrow">In season now</p>
              <h2 id="harvest-h" className="display-lg mt-4 text-forest">{home.harvestHeading}</h2>
            </div>
            <p className="lede lg:col-span-5 lg:col-start-8">{home.harvestIntro}</p>
          </div>

          {products.length ? (
            <div className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProductCard product={p} priority={i === 0} />
                </Reveal>
              ))}
              {upcoming.length > 0 && (
                <Reveal delay={products.length * 80} className="flex">
                  <div className="paper flex w-full flex-col justify-between border border-sand-300 bg-sand/60 p-8">
                    <div>
                      <p className="eyebrow">The chapters ahead</p>
                      <p className="mt-4 font-display text-3xl leading-tight text-forest">More of Pakistan&rsquo;s seasonal fruit, one harvest at a time.</p>
                    </div>
                    <ul className="mt-8 divide-y divide-sand-300 border-y border-sand-300">
                      {upcoming.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                          <span className="flex items-center gap-3">
                            {c.image && <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-sand"><Image src={c.image} alt="" fill sizes="40px" className="object-cover" /></span>}
                            <span className="font-display text-xl text-forest">{c.name}</span>
                          </span>
                          <span className="text-xs uppercase tracking-[0.14em] text-stone">{c.season ?? "Upcoming"}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/shop#upcoming" className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-forest">
                      Notify me <IconArrow />
                    </Link>
                  </div>
                </Reveal>
              )}
            </div>
          ) : (
            <p className="mt-16 text-stone">The next harvest is being prepared. Subscribe below and we will let you know when orders open.</p>
          )}
        </div>
      </section>

      {/* ── From our orchards (journey) ────────────────── */}
      <section className="bg-forest py-24 text-ivory sm:py-32" aria-labelledby="journey-h">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="eyebrow !text-gold">Orchard to home</p>
            <h2 id="journey-h" className="display-lg mt-4">{home.journeyHeading}</h2>
            <p className="mt-6 text-lg leading-relaxed text-ivory/75">{home.journeyIntro}</p>
          </div>
        </div>
        <ol className="no-scrollbar mt-16 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-[max(3rem,calc((100vw-1320px)/2+3rem))]">
          {home.journeySteps.map((s, i) => (
            <li key={i} className="w-[78vw] max-w-[340px] shrink-0 snap-start">
              <SmartImage src={s.image} alt={s.title} className="aspect-[3/4] w-full" sizes="340px" variant={i % 2 ? "day" : "dawn"} seed={i * 13 + 5} />
              <p className="mt-6 font-display text-5xl text-gold/70">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 font-display text-2xl">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ivory/70">{s.body}</p>
            </li>
          ))}
          <li className="w-4 shrink-0" aria-hidden />
        </ol>
        <div className="container-x mt-10">
          <Link href="/orchards" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory">
            Visit our orchards <IconArrow />
          </Link>
        </div>
      </section>

      {/* ── Difference ─────────────────────────────────── */}
      <section className="py-24 sm:py-32" aria-labelledby="diff-h">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Our promise</p>
            <h2 id="diff-h" className="display-md mt-4 text-forest">{home.differenceHeading}</h2>
            <div className="rule-gold mt-8" />
          </div>
          <ul className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:col-span-8">
            {home.differencePoints.map((d, i) => {
              const Icon = DIFF_ICONS[i % DIFF_ICONS.length];
              return (
                <Reveal key={i} delay={i * 60}>
                  <li className="list-none">
                    <Icon className="h-7 w-7 text-citrus" />
                    <h3 className="mt-5 font-display text-2xl text-forest">{d.title}</h3>
                    <p className="mt-2 leading-relaxed text-stone">{d.body}</p>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Packaging experience ───────────────────────── */}
      <section className="paper bg-sand/70 py-24 sm:py-32" aria-labelledby="exp-h">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <p className="eyebrow">Packaging</p>
              <h2 id="exp-h" className="display-lg mt-4 text-forest">{home.experienceHeading}</h2>
            </div>
            <p className="lede lg:col-span-5 lg:col-start-8">{home.experienceIntro}</p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {home.packaging.map((p, i) => (
              <Reveal key={i} delay={i * 80}>
                <figure>
                  <SmartImage src={p.image} alt={p.title} className="aspect-[4/3] w-full bg-ivory" sizes="(min-width:1024px) 25vw, 50vw" placeholderLabel={null} />
                  <figcaption className="mt-5">
                    <h3 className="font-display text-2xl text-forest">{p.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone">{p.body}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-xs text-stone">Packaging shown as design concepts; final production may differ.</p>
          <div className="mt-8">
            <Link href="/gifts" className="btn-outline">Explore gift boxes</Link>
          </div>
        </div>
      </section>

      {/* ── Philosophy ─────────────────────────────────── */}
      <section className="py-24 sm:py-36" aria-labelledby="phil-h">
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <SmartImage src={home.philosophyImage} alt="Ripe citrus fruit" className="aspect-[4/5] w-full" sizes="(min-width:1024px) 40vw, 100vw" variant="day" seed={21} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow">Our philosophy</p>
            <h2 id="phil-h" className="display-lg mt-4 text-forest">{home.philosophyHeading}</h2>
            <Paragraphs text={home.philosophyBody} className="mt-8 text-lg leading-relaxed text-stone" />
            <p className="urdu mt-8 text-2xl text-gold-700" lang="ur">{brand.nameUrdu}</p>
            <Link href="/our-story" className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-forest">
              Read our story <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Customer experiences (genuine only) ────────── */}
      {reviews.length > 0 && (
        <section className="border-t border-sand-300 py-24" aria-labelledby="rev-h">
          <div className="container-x">
            <p className="eyebrow">Verified orders</p>
            <h2 id="rev-h" className="display-md mt-4 text-forest">{home.reviewsHeading}</h2>
            <ul className="mt-12 grid gap-10 md:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id} className="border-t border-gold pt-6">
                  <p className="text-citrus" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-sand-300">{"★".repeat(5 - r.rating)}</span></p>
                  <blockquote className="mt-4 font-display text-xl leading-snug text-forest">&ldquo;{r.body}&rdquo;</blockquote>
                  <p className="mt-4 text-sm text-stone">{r.name}{r.city ? `, ${r.city}` : ""}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Journal ────────────────────────────────────── */}
      {articles.length > 0 && (
        <section className="bg-ivory py-24 sm:py-32" aria-labelledby="jr-h">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Stories</p>
                <h2 id="jr-h" className="display-lg mt-4 text-forest">{home.journalHeading}</h2>
              </div>
              <Link href="/journal" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-forest">
                All stories <IconArrow />
              </Link>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {articles.map((a, i) => (
                <Reveal key={a.id} delay={i * 80}>
                  <Link href={`/journal/${a.slug}`} className="group block">
                    <SmartImage src={a.coverImage} alt={a.title} className="aspect-[3/2] w-full" sizes="(min-width:768px) 33vw, 100vw" seed={a.title.length} variant={i === 1 ? "day" : "dawn"} placeholderLabel={null} />
                    <p className="eyebrow mt-5">{a.category}</p>
                    <h3 className="mt-2 font-display text-2xl leading-snug text-forest group-hover:text-citrus-700">{a.title}</h3>
                    {a.excerpt && <p className="mt-2 text-[15px] leading-relaxed text-stone">{a.excerpt}</p>}
                    <p className="mt-3 text-xs text-stone">{formatDate(a.publishedAt)}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-forest-900 py-24 text-ivory sm:py-28" aria-labelledby="nl-h">
        <OrchardScene variant="dusk" className="absolute inset-0 h-full w-full opacity-25" seed={4} label="" />
        <div className="container-x relative max-w-2xl text-center">
          <p className="eyebrow !text-gold">Seasonal updates</p>
          <h2 id="nl-h" className="display-md mt-4">{home.newsletterHeading}</h2>
          <p className="mx-auto mt-4 max-w-lg text-ivory/70">{home.newsletterBody}</p>
          <div className="mx-auto max-w-lg text-left">
            <NewsletterForm tone="dark" source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
