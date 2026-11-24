/**
 * Extension Popup Controller
 * Connects to the shared ChatEngine and handles webpage contextual summaries
 */
import { ApiClient } from '../../shared/core/api-client.js';
import { ChatEngine } from '../../shared/core/chat-engine.js';
import { ExtensionStorageAdapter } from '../../shared/storage/extension-adapter.js';
import { renderMarkdown } from '../../shared/utils/markdown-renderer.js';
import { globalBus } from '../../shared/core/event-bus.js';
import { $, $$, escapeHtml } from '../../shared/utils/dom-helpers.js';

const BACKEND_URL = 'http://localhost:3000';

async function initPopup() {
  const apiClient = new ApiClient(BACKEND_URL);
  const storageAdapter = new ExtensionStorageAdapter();
  const engine = new ChatEngine({ apiClient, storageAdapter });

  const messagesContainer = $('#popup-messages');
  const emptyState = $('#popup-empty-state');
  const input = $('#popup-input');
  const sendBtn = $('#popup-send-btn');
  const newChatBtn = $('#ext-new-chat-btn');
  const openWebBtn = $('#ext-open-web-btn');
  const contextBanner = $('#page-context-banner');
  const contextLabel = $('#page-context-label');
  const dismissContextBtn = $('#dismiss-context-btn');

  let activePageContext = null;

  // Initialize engine
  await engine.init();

  // Open full web app
  openWebBtn?.addEventListener('click', () => {
    const url = 'http://localhost:3000';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  });

  newChatBtn?.addEventListener('click', () => {
    engine.createNewConversation();
  });

  // Check active tab content upon explicit user action
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url && !activeTab.url.startsWith('chrome://')) {
        contextBanner.style.display = 'flex';
        contextLabel.textContent = `Page: ${activeTab.title || 'Current Webpage'}`.slice(0, 36) + '...';
        activePageContext = {
          title: activeTab.title,
          url: activeTab.url,
          id: activeTab.id
        };
      }
    });
  }

  dismissContextBtn?.addEventListener('click', () => {
    contextBanner.style.display = 'none';
    activePageContext = null;
  });

  // Quick prompt buttons
  $$('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const prompt = btn.getAttribute('data-prompt');
      await executePrompt(prompt);
    });
  });

  async function executePrompt(promptText) {
    let finalPrompt = promptText;

    // If context is active and requested page summarization, safely extract page text
    if (activePageContext && typeof chrome !== 'undefined' && chrome.scripting) {
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: activePageContext.id },
          func: () => document.body.innerText.slice(0, 8000)
        });
        if (result?.result) {
          finalPrompt += `\n\n[Webpage Context for "${activePageContext.title}"]: \n${result.result}`;
        }
      } catch (err) {
        console.warn('Could not read tab text:', err);
      }
    }

    engine.sendMessage(finalPrompt);
  }

  // Input & Send listeners
  sendBtn?.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) {
      input.value = '';
      executePrompt(val);
    }
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        input.value = '';
        executePrompt(val);
      }
    }
  });

  // Render helpers
  function renderConversation(conv) {
    messagesContainer.innerHTML = '';
    const messages = conv?.messages || [];

    if (messages.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }

    emptyState.style.display = 'none';
    for (const msg of messages) {
      appendMessage(msg);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendMessage(msg) {
    emptyState.style.display = 'none';
    const isUser = msg.role === 'user';
    const bubble = document.createElement('div');
    bubble.id = msg.id;
    bubble.className = `message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`;
    bubble.style.cssText = `
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.5;
      background-color: ${isUser ? 'var(--color-surface-elevated)' : 'var(--color-surface-secondary)'};
      border: 1px solid var(--color-border);
      max-width: 90%;
      align-self: ${isUser ? 'flex-end' : 'flex-start'};
    `;
    bubble.innerHTML = renderMarkdown(msg.content);
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Bus listeners
  globalBus.on('conversation:loaded', renderConversation);
  globalBus.on('conversation:created', renderConversation);
  globalBus.on('message:added', appendMessage);

  globalBus.on('message:streaming', ({ id, text }) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = renderMarkdown(text);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
}

window.addEventListener('DOMContentLoaded', initPopup);
