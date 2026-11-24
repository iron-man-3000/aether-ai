/**
 * Common Background Context Menu & Message Handlers for Chrome & Firefox
 */
export function setupBackgroundHandlers() {
  const browserAPI = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : null);
  if (!browserAPI) return;

  // Setup right-click Context Menus
  browserAPI.runtime.onInstalled.addListener(() => {
    browserAPI.contextMenus?.create({
      id: 'aether_explain_selection',
      title: 'Aether: Explain "%s"',
      contexts: ['selection']
    });

    browserAPI.contextMenus?.create({
      id: 'aether_summarize_selection',
      title: 'Aether: Summarize selection',
      contexts: ['selection']
    });

    browserAPI.contextMenus?.create({
      id: 'aether_summarize_page',
      title: 'Aether: Summarize this webpage',
      contexts: ['page']
    });
  });

  browserAPI.contextMenus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'aether_explain_selection') {
      const selectedText = info.selectionText;
      openAetherWithPrompt(`Please explain this clearly:\n\n"${selectedText}"`, tab);
    } else if (info.menuItemId === 'aether_summarize_selection') {
      const selectedText = info.selectionText;
      openAetherWithPrompt(`Summarize this passage in concise bullet points:\n\n"${selectedText}"`, tab);
    } else if (info.menuItemId === 'aether_summarize_page') {
      openAetherWithPrompt(`Summarize the key takeaways and main points of this page.`, tab);
    }
  });

  function openAetherWithPrompt(prompt, tab) {
    // If side panel is supported (Chrome 114+), open side panel
    if (browserAPI.sidePanel && tab?.id) {
      browserAPI.sidePanel.open({ tabId: tab.id });
    }
  }
}
