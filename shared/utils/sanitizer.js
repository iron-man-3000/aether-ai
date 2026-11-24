/**
 * XSS Defense & HTML Sanitizer
 * Strips dangerous tags, script injections, javascript: URLs, and event attributes
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  // Forbidden tags
  const forbiddenTags = [
    'script', 'iframe', 'object', 'embed', 'link', 'style', 'base', 'form', 'input', 'button'
  ];

  for (const tag of forbiddenTags) {
    const elements = doc.querySelectorAll(tag);
    for (const el of elements) {
      el.remove();
    }
  }

  // Sanitize all remaining elements
  const allElements = doc.querySelectorAll('*');
  for (const el of allElements) {
    // Remove all event handlers (onclick, onerror, onload, etc.)
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const val = attr.value.toLowerCase().trim();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src') && (val.startsWith('javascript:') || val.startsWith('data:text/html'))) {
        el.removeAttribute(attr.name);
      }
    }

    // Set secure target/rel on anchors
    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}
