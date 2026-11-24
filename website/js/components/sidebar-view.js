/**
 * Sidebar View Component
 * Handles conversation listing, date groupings, search, rename, and deletion
 */
import { $, $$, formatDateGroup, escapeHtml } from '../../shared/utils/dom-helpers.js';
import { globalBus } from '../../shared/core/event-bus.js';

export class SidebarView {
  constructor({ chatEngine }) {
    this.engine = chatEngine;
    this.container = $('#conversation-list');
    this.searchInput = $('#conversation-search');
    this.newChatBtn = $('#new-chat-btn');
    this.sidebar = $('#sidebar');
    this.overlay = $('#sidebar-overlay');
    this.toggleBtn = $('#toggle-sidebar-btn');

    this.conversations = [];
    this.searchQuery = '';

    this.bindEvents();
  }

  bindEvents() {
    this.newChatBtn?.addEventListener('click', () => {
      this.engine.createNewConversation();
      this.closeMobileSidebar();
    });

    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    this.toggleBtn?.addEventListener('click', () => {
      this.sidebar.classList.toggle('is-open');
      this.overlay.classList.toggle('is-open');
    });

    this.overlay?.addEventListener('click', () => {
      this.closeMobileSidebar();
    });

    // Keyboard shortcut Cmd/Ctrl + K for new chat
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.engine.createNewConversation();
      }
    });

    // Bus events
    globalBus.on('conversation:created', () => this.refreshList());
    globalBus.on('conversation:loaded', () => this.refreshList());
    globalBus.on('conversation:saved', () => this.refreshList());
    globalBus.on('conversation:updated', () => this.refreshList());
    globalBus.on('conversation:deleted', () => this.refreshList());
  }

  closeMobileSidebar() {
    this.sidebar.classList.remove('is-open');
    this.overlay.classList.remove('is-open');
  }

  async refreshList() {
    this.conversations = await this.engine.storage.listConversations();
    this.render();
  }

  render() {
    if (!this.container) return;

    let filtered = this.conversations;
    if (this.searchQuery) {
      filtered = filtered.filter(c =>
        (c.title && c.title.toLowerCase().includes(this.searchQuery)) ||
        (c.messages && c.messages.some(m => m.content.toLowerCase().includes(this.searchQuery)))
      );
    }

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div style="padding: var(--space-4); text-align: center; color: var(--color-text-muted); font-size: var(--font-size-xs);">
          ${this.searchQuery ? 'No matching conversations' : 'No chat history yet'}
        </div>
      `;
      return;
    }

    // Group conversations by date
    const groups = new Map();
    for (const conv of filtered) {
      const groupName = formatDateGroup(conv.updatedAt || conv.createdAt);
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName).push(conv);
    }

    let html = '';
    const currentId = this.engine.currentConversation?.id;

    for (const [groupName, convList] of groups.entries()) {
      html += `<div class="date-group-heading">${escapeHtml(groupName)}</div>`;
      for (const conv of convList) {
        const isActive = conv.id === currentId ? 'active' : '';
        html += `
          <div class="conversation-item ${isActive}" data-id="${conv.id}">
            <span class="conversation-title" title="${escapeHtml(conv.title)}">${escapeHtml(conv.title)}</span>
            <div class="conversation-actions">
              <button class="btn btn-icon btn-icon-sm rename-btn" data-id="${conv.id}" title="Rename">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn btn-icon btn-icon-sm delete-btn" data-id="${conv.id}" title="Delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        `;
      }
    }

    this.container.innerHTML = html;

    // Attach row events
    $$('.conversation-item', this.container).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.conversation-actions')) return;
        const id = el.getAttribute('data-id');
        this.engine.switchConversation(id);
        this.closeMobileSidebar();
      });
    });

    $$('.rename-btn', this.container).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const conv = this.conversations.find(c => c.id === id);
        const newTitle = prompt('Rename conversation:', conv?.title || '');
        if (newTitle !== null) {
          this.engine.renameConversation(id, newTitle);
        }
      });
    });

    $$('.delete-btn', this.container).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this conversation?')) {
          this.engine.deleteConversation(id);
        }
      });
    });
  }
}
