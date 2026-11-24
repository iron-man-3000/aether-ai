/**
 * IndexedDB Storage Adapter for the Website
 * Provides high-capacity, robust client-side storage
 */
import { StorageInterface } from './storage-interface.js';

export class IndexedDBAdapter extends StorageInterface {
  constructor(dbName = 'aether_ai_db', version = 1) {
    super();
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Key-Value Settings & Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // User Memories store
        if (!db.objectStoreNames.contains('memories')) {
          db.createObjectStore('memories', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
      };
    });
  }

  async getConversation(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveConversation(conversation) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const req = store.put(conversation);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async listConversations() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const index = store.index('updatedAt');
      const req = index.getAll();
      req.onsuccess = () => {
        // Return sorted by most recent first
        const list = (req.result || []).sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteConversation(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getLastActiveConversationId() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get('lastActiveId');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });
  }

  async setLastActiveConversationId(id) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      store.put({ key: 'lastActiveId', value: id });
      tx.oncomplete = () => resolve(true);
    });
  }

  async getSettings() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const req = store.get('userSettings');
      req.onsuccess = () => resolve(req.result?.value || {});
      req.onerror = () => resolve({});
    });
  }

  async saveSettings(settings) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      store.put({ key: 'userSettings', value: settings });
      tx.oncomplete = () => resolve(true);
    });
  }

  async getMemories() {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('memories', 'readonly');
      const store = tx.objectStore('memories');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async saveMemories(memories) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      store.clear();
      for (const m of memories) {
        store.put(m);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }
}
