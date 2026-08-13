const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "span"
]);

const DISALLOWED_BLOCKS = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi;
const DISALLOWED_SELF_CLOSING = /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base)[^>]*\/?>/gi;
const EVENT_HANDLERS = /\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JS_PROTOCOLS = /(javascript:|data:text\/html|vbscript:)/gi;

const escapeHtmlAttr = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeHref = (rawHref = "") => {
  const href = String(rawHref || "").trim();
  if (!href) return "";
  if (JS_PROTOCOLS.test(href.toLowerCase())) return "";
  return href;
};

const extractLinkHref = (attrs = "") => {
  const match = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  return match ? (match[2] || match[3] || match[4] || "") : "";
};

const sanitizePageHtml = (html = "") => {
  let value = String(html || "");

  value = value.replace(DISALLOWED_BLOCKS, "");
  value = value.replace(DISALLOWED_SELF_CLOSING, "");
  value = value.replace(EVENT_HANDLERS, "");

  // Remove soft hyphens (&shy; and \u00AD) that cause awkward mid-word breaks
  value = value.replace(/&shy;/gi, "").replace(/\u00AD/g, "");

  value = value.replace(/<([a-z0-9-]+)([^>]*)>/gi, (full, tagName, attrs = "") => {
    const tag = String(tagName || "").toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";

    let safeAttrs = "";

    // Preserve safe Quill formatting classes (ql-*)
    const classMatch = attrs.match(/\sclass\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (classMatch) {
      const classVal = classMatch[2] || classMatch[3] || classMatch[4] || "";
      const safeClasses = classVal
        .split(/\s+/)
        .filter(c => /^ql-[a-z0-9-]+$/i.test(c) || /^text-[a-z0-9-]+$/i.test(c))
        .join(" ");
      if (safeClasses) {
        safeAttrs += ` class="${escapeHtmlAttr(safeClasses)}"`;
      }
    }

    // Preserve data-list attribute for Quill lists
    const dataListMatch = attrs.match(/\sdata-list\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (dataListMatch) {
      const dataListVal = dataListMatch[2] || dataListMatch[3] || dataListMatch[4] || "";
      safeAttrs += ` data-list="${escapeHtmlAttr(dataListVal)}"`;
    }

    if (tag === "a") {
      const href = normalizeHref(extractLinkHref(attrs));
      if (href) {
        safeAttrs += ` href="${escapeHtmlAttr(href)}" rel="noopener noreferrer"`;
      }
    }

    return `<${tag}${safeAttrs}>`;
  });

  value = value.replace(/<\/([a-z0-9-]+)>/gi, (full, tagName) => {
    const tag = String(tagName || "").toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    return `</${tag}>`;
  });

  return value.trim();
};

const getPlainTextFromHtml = (html = "") =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

module.exports = {
  sanitizePageHtml,
  getPlainTextFromHtml
};
