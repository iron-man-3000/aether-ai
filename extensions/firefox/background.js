// Firefox WebExtension background script
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'aether_explain_selection',
    title: 'Aether: Explain "%s"',
    contexts: ['selection']
  });

  browser.contextMenus.create({
    id: 'aether_summarize_page',
    title: 'Aether: Summarize this webpage',
    contexts: ['page']
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (browser.sidebarAction) {
    browser.sidebarAction.open();
  }
});
