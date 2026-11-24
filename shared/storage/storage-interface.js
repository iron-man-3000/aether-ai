/**
 * Storage Interface Contract
 * Shared by IndexedDB (Web) and Extension Storage (Chrome/Firefox)
 */
export class StorageInterface {
  async init() {
    throw new Error('Not implemented');
  }

  async getConversation(id) {
    throw new Error('Not implemented');
  }

  async saveConversation(conversation) {
    throw new Error('Not implemented');
  }

  async listConversations() {
    throw new Error('Not implemented');
  }

  async deleteConversation(id) {
    throw new Error('Not implemented');
  }

  async getLastActiveConversationId() {
    throw new Error('Not implemented');
  }

  async setLastActiveConversationId(id) {
    throw new Error('Not implemented');
  }

  async getSettings() {
    throw new Error('Not implemented');
  }

  async saveSettings(settings) {
    throw new Error('Not implemented');
  }

  async getMemories() {
    throw new Error('Not implemented');
  }

  async saveMemories(memories) {
    throw new Error('Not implemented');
  }
}
