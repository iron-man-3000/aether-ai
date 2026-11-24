/**
 * Zero-dependency, secure Markdown Renderer with Code Blocks and Syntax Highlighting
 */
import { sanitizeHtml } from './sanitizer.js';

export function renderMarkdown(rawText) {
  if (!rawText) return '';

  let html = rawText;

  // Protect code blocks before formatting
  const codeBlocks = [];
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({ lang: lang || 'text', code });
    return id;
  });

  // Protect inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(code);
    return id;
  });

  // Escape basic HTML characters
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr style="border:none; border-top:1px solid var(--color-border); margin:var(--space-6) 0;" />');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered Lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');

  // Ordered Lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<ol><li>$1</li></ol>');
  html = html.replace(/<\/ol>\s*<ol>/gim, '');

  // Paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') ||
        block.startsWith('<blockquote') || block.startsWith('__CODE_BLOCK_') || block.startsWith('<hr')) {
      return block;
    }
    return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  // Restore inline codes
  inlineCodes.forEach((code, i) => {
    const safe = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(`__INLINE_CODE_${i}__`, `<code>${safe}</code>`);
  });

  // Restore code blocks with Copy Button & Syntax Header
  codeBlocks.forEach((item, i) => {
    const safeCode = item.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const blockMarkup = `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-lang">${item.lang}</span>
          <button class="btn btn-ghost btn-sm copy-code-btn" data-code="${encodeURIComponent(item.code)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>
        <pre><code class="language-${item.lang}">${safeCode}</code></pre>
      </div>
    `;
    html = html.replace(`__CODE_BLOCK_${i}__`, blockMarkup);
  });

  return sanitizeHtml(html);
}
