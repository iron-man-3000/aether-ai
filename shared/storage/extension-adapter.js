/**
 * Extension Storage Adapter for Chrome & Firefox (storage.local)
 * Wraps chrome.storage.local / browser.storage.local with the StorageInterface
 */
import { StorageInterface } from './storage-interface.js';

export class ExtensionStorageAdapter extends StorageInterface {
  constructor() {
    super();
    this.storageAPI = (typeof browser !== 'undefined' && browser.storage)
      ? browser.storage.local
      : (typeof chrome !== 'undefined' && chrome.storage)
        ? chrome.storage.local
        : null;
  }

  async init() {
    if (!this.storageAPI) {
      console.warn('Extension storage API unavailable; fallback to in-memory/localStorage.');
    }
    return true;
  }

  async _get(key) {
    if (this.storageAPI) {
      return new Promise((resolve) => {
        this.storageAPI.get([key], (result) => resolve(result[key]));
      });
    }
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  }

  async _set(key, value) {
    if (this.storageAPI) {
      return new Promise((resolve) => {
        this.storageAPI.set({ [key]: value }, () => resolve(true));
      });
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  }

  async getConversation(id) {
    const all = (await this._get('aether_conversations')) || {};
    return all[id] || null;
  }

  async saveConversation(conversation) {
    const all = (await this._get('aether_conversations')) || {};
    all[conversation.id] = conversation;
    await this._set('aether_conversations', all);
    return true;
  }

  async listConversations() {
    const all = (await this._get('aether_conversations')) || {};
    return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteConversation(id) {
    const all = (await this._get('aether_conversations')) || {};
    delete all[id];
    await this._set('aether_conversations', all);
    return true;
  }

  async getLastActiveConversationId() {
    return await this._get('aether_last_active_id');
  }

  async setLastActiveConversationId(id) {
    return await this._set('aether_last_active_id', id);
  }

  async getSettings() {
    return (await this._get('aether_settings')) || {};
  }

  async saveSettings(settings) {
    return await this._set('aether_settings', settings);
  }

  async getMemories() {
    return (await this._get('aether_memories')) || [];
  }

  async saveMemories(memories) {
    return await this._set('aether_memories', memories);
  }
}
