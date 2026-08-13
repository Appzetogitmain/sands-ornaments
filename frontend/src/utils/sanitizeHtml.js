import DOMPurify from 'dompurify';

export const sanitizeHtml = (html = '') => {
  const cleanInput = String(html || '').replace(/&shy;/gi, '').replace(/\u00AD/g, '');
  return DOMPurify.sanitize(cleanInput, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['class', 'data-list', 'target', 'rel']
  });
};
