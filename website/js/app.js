/**
 * Website Application Bootstrap
 */
import { ApiClient } from '../../shared/core/api-client.js';
import { ChatEngine } from '../../shared/core/chat-engine.js';
import { createStorageAdapter } from '../../shared/storage/storage-factory.js';
import { SidebarView } from './components/sidebar-view.js';
import { ChatView } from './components/chat-view.js';
import { InputView } from './components/input-view.js';
import { ModalView } from './components/modal-view.js';
import { ArtifactsView } from './components/artifacts-view.js';
import { CONFIG } from './config.js';

async function initApp() {
  const apiClient = new ApiClient(CONFIG.DEFAULT_API_BASE_URL);
  const storageAdapter = createStorageAdapter();

  const chatEngine = new ChatEngine({ apiClient, storageAdapter });

  // Initialize UI components
  const sidebar = new SidebarView({ chatEngine });
  const chatView = new ChatView({ chatEngine });
  const inputView = new InputView({ chatEngine });
  const modalView = new ModalView({ chatEngine });
  const artifactsView = new ArtifactsView({ chatEngine });

  // Initialize engine state & load persisted conversations
  await chatEngine.init();
  const settings = await storageAdapter.getSettings();
  if (settings) {
    if (settings.apiKey) apiClient.setApiKey(settings.apiKey);
    if (settings.serverUrl) apiClient.setBaseUrl(settings.serverUrl);
  }
  await sidebar.refreshList();

  console.log('Aether AI Website initialized successfully.');
}

window.addEventListener('DOMContentLoaded', initApp);
