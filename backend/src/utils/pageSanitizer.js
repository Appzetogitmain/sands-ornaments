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

const SOFT_HYPHEN_REGEX = /&shy;|&#173;|&#x0*ad;|\u00AD|&#8203;|&#x200b;|&ZeroWidthSpace;|\u200B|\u200C|\u200D/gi;

const sanitizePageHtml = (html = "") => {
  let value = String(html || "");

  value = value.replace(DISALLOWED_BLOCKS, "");
  value = value.replace(DISALLOWED_SELF_CLOSING, "");
  value = value.replace(EVENT_HANDLERS, "");

  // Remove all forms of soft hyphens & zero-width spaces that cause mid-word breaks
  value = value.replace(SOFT_HYPHEN_REGEX, "");

  // Convert non-breaking spaces (&nbsp; and \u00A0) to normal spaces so browser wraps words naturally
  value = value.replace(/&nbsp;/gi, " ").replace(/\u00A0/g, " ");

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

  // Repair inline formatting tags that split words across tag boundaries (e.g. <strong>video</strong>s -> <strong>videos</strong>)
  const inlineTags = new Set(["strong", "em", "b", "i", "u", "s", "span", "a"]);
  for (let pass = 0; pass < 2; pass++) {
    value = value.replace(/<([a-z0-9-]+)([^>]*)>([^<]+)<\/\1>([a-zA-Z0-9_-]+)/gi, (match, tag, attrs, content, trailing) => {
      if (inlineTags.has(tag.toLowerCase())) {
        return `<${tag}${attrs}>${content}${trailing}</${tag}>`;
      }
      return match;
    });
    value = value.replace(/([a-zA-Z0-9_-]+)<([a-z0-9-]+)([^>]*)>([^<]+)<\/\2>/gi, (match, leading, tag, attrs, content) => {
      if (inlineTags.has(tag.toLowerCase())) {
        return `<${tag}${attrs}>${leading}${content}</${tag}>`;
      }
      return match;
    });
  }

  // Repair accidental &nbsp; split words inserted by rich text copy-pasting
  value = value
    .replace(/\bth&nbsp;e\b/gi, "the")
    .replace(/\brelationshi&nbsp;p\b/gi, "relationship")
    .replace(/\bthe&nbsp;s&nbsp;ystems\b/gi, "the systems")
    .replace(/\bvideo&nbsp;s\b/gi, "videos")
    .replace(/technology-&nbsp;driven/gi, "technology-driven")
    .replace(/\bthr&nbsp;oughout\b/gi, "throughout")
    .replace(/\bw&nbsp;ithin\b/gi, "within")
    .replace(/\btransparanc&nbsp;y\b/gi, "transparency")
    .replace(/\btechno&nbsp;logy/gi, "technology");

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
