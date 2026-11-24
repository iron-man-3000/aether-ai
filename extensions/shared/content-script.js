/**
 * Browser Extension Content Script
 * Listens for contextual selections and presents non-intrusive action cues
 */
(() => {
  // Prevent duplicate execution
  if (window.__AETHER_CONTENT_SCRIPT_LOADED__) return;
  window.__AETHER_CONTENT_SCRIPT_LOADED__ = true;

  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection()?.toString()?.trim();
    if (selectedText && selectedText.length > 3) {
      // Send selected text to background script to enable context menus
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'AETHER_SELECTION_UPDATED',
          text: selectedText.slice(0, 4000)
        }).catch(() => {});
      }
    }
  });
})();
