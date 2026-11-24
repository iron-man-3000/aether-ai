import { setupBackgroundHandlers } from '../shared/background-common.js';

// Setup background context menus & messaging
setupBackgroundHandlers();

// Allow opening side panel on action icon click if user configured
chrome.sidePanel
  ?.setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error(error));
