// HTML-escape a value destined for a double-quoted attribute so quotes/markup
// characters can't break out of the tag or splice in unintended attributes.
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
