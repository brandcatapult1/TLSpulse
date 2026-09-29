// Server-only: clean rich-text notes before they're stored, so rendering them as HTML is safe.
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

/** Returns clean HTML, or null when there's no visible text (e.g. an empty "<p></p>"). */
export function sanitizeNotes(input: string | null | undefined): string | null {
  if (!input) return null;
  const clean = sanitizeHtml(input, OPTIONS).trim();
  const text = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").trim();
  return text ? clean : null;
}
