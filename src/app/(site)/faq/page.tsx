import { jsonLd } from "@/lib/safe";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Markdown, renderMarkdown } from "@/components/ui/Markdown";

export const metadata: Metadata = { title: "Questions", description: "Answers about ordering, delivery, our fruit, gifting and returns.", alternates: { canonical: "/faq" } };

export default async function Faq() {
  const faqs = await prisma.faq.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }] });
  const groups = [...new Set(faqs.map((f) => f.group))];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: renderMarkdown(f.answer) } })) };
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="eyebrow">Help</p>
      <h1 className="display-lg mt-4 text-forest">Questions</h1>
      {groups.map((g) => (
        <section key={g} className="mt-14">
          <h2 className="eyebrow">{g}</h2>
          <div className="mt-4 divide-y divide-sand-300 border-y border-sand-300">
            {faqs.filter((f) => f.group === g).map((f) => (
              <details key={f.id} className="group py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-xl text-forest">
                  {f.question}<span className="shrink-0 text-2xl transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <Markdown className="pb-4 !text-base">{f.answer}</Markdown>
              </details>
            ))}
          </div>
        </section>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
    </div>
  );
}
