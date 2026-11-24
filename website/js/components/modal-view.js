/**
 * Modal View Component
 * Handles Settings & User Memory Modals
 */
import { $, $$, escapeHtml } from '../../shared/utils/dom-helpers.js';

export class ModalView {
  constructor({ chatEngine }) {
    this.engine = chatEngine;

    // Settings Modal elements
    this.settingsModal = $('#settings-modal');
    this.openSettingsBtn = $('#open-settings-btn');
    this.closeSettingsBtn = $('#close-settings-modal-btn');
    this.saveSettingsBtn = $('#save-settings-btn');
    this.styleSelect = $('#setting-style');
    this.customInstructions = $('#setting-custom-instructions');
    this.serverUrlInput = $('#setting-server-url');
    this.apiKeyInput = $('#setting-api-key');

    // Memory Modal elements
    this.memoryModal = $('#memory-modal');
    this.openMemoryBtn = $('#open-memory-btn');
    this.closeMemoryBtn = $('#close-memory-modal-btn');
    this.newMemoryInput = $('#new-memory-input');
    this.addMemoryBtn = $('#add-memory-btn');
    this.clearAllMemoryBtn = $('#clear-all-memory-btn');
    this.memoryList = $('#memory-list');

    this.bindEvents();
  }

  bindEvents() {
    // Settings open/close
    this.openSettingsBtn?.addEventListener('click', async () => {
      const settings = await this.engine.storage.getSettings();
      if (settings.style) this.styleSelect.value = settings.style;
      if (settings.customInstructions) this.customInstructions.value = settings.customInstructions;
      if (settings.serverUrl) this.serverUrlInput.value = settings.serverUrl;
      if (settings.apiKey) this.apiKeyInput.value = settings.apiKey;
      this.settingsModal.classList.add('is-open');
    });

    this.closeSettingsBtn?.addEventListener('click', () => {
      this.settingsModal.classList.remove('is-open');
    });

    this.saveSettingsBtn?.addEventListener('click', async () => {
      const newSettings = {
        style: this.styleSelect.value,
        customInstructions: this.customInstructions.value.trim(),
        serverUrl: this.serverUrlInput.value.trim(),
        apiKey: this.apiKeyInput.value.trim()
      };
      this.engine.currentStyle = newSettings.style;
      if (newSettings.serverUrl) {
        this.engine.apiClient.setBaseUrl(newSettings.serverUrl);
      }
      if (newSettings.apiKey) {
        this.engine.apiClient.setApiKey(newSettings.apiKey);
      }
      await this.engine.storage.saveSettings(newSettings);
      this.settingsModal.classList.remove('is-open');
    });

    // Memory open/close
    this.openMemoryBtn?.addEventListener('click', async () => {
      await this.renderMemories();
      this.memoryModal.classList.add('is-open');
    });

    this.closeMemoryBtn?.addEventListener('click', () => {
      this.memoryModal.classList.remove('is-open');
    });

    this.addMemoryBtn?.addEventListener('click', async () => {
      const text = this.newMemoryInput.value.trim();
      if (!text) return;
      const memories = await this.engine.storage.getMemories();
      memories.push({ id: `mem_${Date.now()}`, text, createdAt: Date.now() });
      await this.engine.storage.saveMemories(memories);
      this.newMemoryInput.value = '';
      await this.renderMemories();
    });

    this.clearAllMemoryBtn?.addEventListener('click', async () => {
      if (confirm('Clear all stored memories?')) {
        await this.engine.storage.saveMemories([]);
        await this.renderMemories();
      }
    });

    // Close on backdrop click
    [this.settingsModal, this.memoryModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('is-open');
      });
    });
  }

  async renderMemories() {
    if (!this.memoryList) return;
    const memories = await this.engine.storage.getMemories();
    if (memories.length === 0) {
      this.memoryList.innerHTML = `<p class="text-sm text-muted">No memories stored yet.</p>`;
      return;
    }

    this.memoryList.innerHTML = memories.map((m, idx) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:var(--space-2) 0; border-bottom:1px solid var(--color-border-subtle);">
        <span class="text-sm">${escapeHtml(m.text)}</span>
        <button class="btn btn-icon btn-icon-sm delete-memory-btn" data-id="${m.id}" title="Delete memory">&times;</button>
      </div>
    `).join('');

    $$('.delete-memory-btn', this.memoryList).forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        let mems = await this.engine.storage.getMemories();
        mems = mems.filter(m => m.id !== id);
        await this.engine.storage.saveMemories(mems);
        await this.renderMemories();
      });
    });
  }
}
