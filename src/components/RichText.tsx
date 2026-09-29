// Displays shoot notes. New notes are HTML cleaned by the server on save; older notes
// were plain text, so those are escaped and their line breaks kept.
import clsx from "clsx";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const looksLikeHtml = (s: string) => /<(p|br|ul|ol|li|strong|b|em|i|u|s|a)\b/i.test(s);

export function RichText({ html, className }: { html: string; className?: string }) {
  const safe = looksLikeHtml(html) ? html : escape(html).replace(/\n/g, "<br>");
  return <div className={clsx("rich-text", className)} dangerouslySetInnerHTML={{ __html: safe }} />;
}
