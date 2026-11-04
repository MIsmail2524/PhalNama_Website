import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { clsx } from "clsx";

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string) {
  const html = marked.parse(md || "", { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h2", "h3", "h4"]),
    allowedAttributes: { a: ["href", "title", "target", "rel"], img: ["src", "alt", "title"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener" }) },
  });
}

export function Markdown({ children, className }: { children?: string | null; className?: string }) {
  if (!children) return null;
  return <div className={clsx("prose-pn", className)} dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }} />;
}

/** Plain paragraphs from text with blank-line breaks (for short settings copy). */
export function Paragraphs({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return (
    <div className={clsx("space-y-4", className)}>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
