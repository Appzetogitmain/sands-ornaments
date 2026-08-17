import DOMPurify from 'dompurify';

const SOFT_HYPHEN_REGEX = /&shy;|&#173;|&#x0*ad;|\u00AD|&#8203;|&#x200b;|&ZeroWidthSpace;|\u200B|\u200C|\u200D/gi;

const inlineTags = new Set(["strong", "em", "b", "i", "u", "s", "span", "a"]);

export const sanitizeHtml = (html = '') => {
  let cleanInput = String(html || '')
    .replace(SOFT_HYPHEN_REGEX, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ');
  
  for (let pass = 0; pass < 2; pass++) {
    cleanInput = cleanInput.replace(/<([a-z0-9-]+)([^>]*)>([^<]+)<\/\1>([a-zA-Z0-9_-]+)/gi, (match, tag, attrs, content, trailing) => {
      if (inlineTags.has(tag.toLowerCase())) {
        return `<${tag}${attrs}>${content}${trailing}</${tag}>`;
      }
      return match;
    });
    cleanInput = cleanInput.replace(/([a-zA-Z0-9_-]+)<([a-z0-9-]+)([^>]*)>([^<]+)<\/\2>/gi, (match, leading, tag, attrs, content) => {
      if (inlineTags.has(tag.toLowerCase())) {
        return `<${tag}${attrs}>${leading}${content}</${tag}>`;
      }
      return match;
    });
  }

  cleanInput = cleanInput
    .replace(/\bth&nbsp;e\b/gi, "the")
    .replace(/\brelationshi&nbsp;p\b/gi, "relationship")
    .replace(/\bthe&nbsp;s&nbsp;ystems\b/gi, "the systems")
    .replace(/\bvideo&nbsp;s\b/gi, "videos")
    .replace(/technology-&nbsp;driven/gi, "technology-driven")
    .replace(/\bthr&nbsp;oughout\b/gi, "throughout")
    .replace(/\bw&nbsp;ithin\b/gi, "within")
    .replace(/\btransparanc&nbsp;y\b/gi, "transparency")
    .replace(/\btechno&nbsp;logy/gi, "technology");

  return DOMPurify.sanitize(cleanInput, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['class', 'data-list', 'target', 'rel']
  });
};
