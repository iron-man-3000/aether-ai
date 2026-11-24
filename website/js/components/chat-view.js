/**
 * Chat View Component with Streaming Cursor and Seamless Transition Animations
 */
import { $, $$, escapeHtml } from '../../shared/utils/dom-helpers.js';
import { renderMarkdown } from '../../shared/utils/markdown-renderer.js';
import { globalBus } from '../../shared/core/event-bus.js';
import { VoiceController } from '../../shared/utils/voice.js';

export class ChatView {
  constructor({ chatEngine }) {
    this.engine = chatEngine;
    this.viewport = $('#chat-viewport');
    this.welcomeScreen = $('#welcome-screen');
    this.messagesContainer = $('#messages-container');
    this.scrollBottomBtn = $('#scroll-bottom-btn');
    this.voice = new VoiceController();

    this.isAutoScrollEnabled = true;

    this.bindEvents();
  }

  bindEvents() {
    // Scroll detection
    this.viewport.addEventListener('scroll', () => {
      const distance = this.viewport.scrollHeight - (this.viewport.scrollTop + this.viewport.clientHeight);
      this.isAutoScrollEnabled = distance < 60;
      if (distance > 180) {
        this.scrollBottomBtn.classList.add('visible');
      } else {
        this.scrollBottomBtn.classList.remove('visible');
      }
    });

    this.scrollBottomBtn.addEventListener('click', () => {
      this.scrollToBottom(true);
    });

    // Prompt cards in welcome screen
    $$('.prompt-card', this.welcomeScreen).forEach(card => {
      card.addEventListener('click', () => {
        const promptText = card.getAttribute('data-prompt');
        if (promptText) {
          this.engine.sendMessage(promptText);
        }
      });
    });

    // Event Bus listeners
    globalBus.on('conversation:loaded', (conv) => this.renderConversation(conv));
    globalBus.on('conversation:created', (conv) => this.renderConversation(conv));

    globalBus.on('message:added', (msg) => {
      this.welcomeScreen.style.display = 'none';
      this.messagesContainer.style.display = 'flex';
      this.appendMessageElement(msg);
      this.scrollToBottom();
    });

    globalBus.on('message:streaming', ({ id, text }) => {
      const msgEl = $(`#${id}`);
      if (msgEl) {
        const contentEl = msgEl.querySelector('.message-content');
        if (contentEl) {
          // Render markdown text and append lively streaming cursor
          contentEl.innerHTML = renderMarkdown(text) + '<span class="streaming-cursor"></span>';
          this.bindMessageDynamicActions(msgEl);
          if (this.isAutoScrollEnabled) this.scrollToBottom();
        }
      }
    });

    globalBus.on('message:sources', ({ id, sources }) => {
      const msgEl = $(`#${id}`);
      if (msgEl && sources?.length > 0) {
        const bodyEl = msgEl.querySelector('.message-body');
        let sourcesTray = msgEl.querySelector('.sources-container');
        if (!sourcesTray) {
          sourcesTray = document.createElement('div');
          sourcesTray.className = 'sources-container';
          bodyEl.appendChild(sourcesTray);
        }
        sourcesTray.innerHTML = sources.map(s => `
          <a class="source-pill" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            <span>${escapeHtml(s.title || s.url)}</span>
          </a>
        `).join('');
      }
    });

    globalBus.on('message:removed', (id) => {
      const el = $(`#${id}`);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => el.remove(), 200);
      }
    });

    globalBus.on('message:completed', (msg) => {
      const msgEl = $(`#${msg.id}`);
      if (msgEl) {
        // Remove blinking cursor when generation completes
        msgEl.querySelector('.streaming-cursor')?.remove();
        const actions = msgEl.querySelector('.message-actions');
        if (actions) actions.style.display = 'flex';
        this.bindMessageDynamicActions(msgEl);
      }
    });
  }

  scrollToBottom(force = false) {
    if (this.isAutoScrollEnabled || force) {
      this.viewport.scrollTo({
        top: this.viewport.scrollHeight,
        behavior: force ? 'smooth' : 'auto'
      });
    }
  }

  renderConversation(conv) {
    this.messagesContainer.innerHTML = '';
    const messages = conv?.messages || [];

    if (messages.length === 0) {
      // Re-trigger entrance animation on welcome screen
      this.welcomeScreen.style.display = 'flex';
      this.welcomeScreen.style.animation = 'none';
      void this.welcomeScreen.offsetWidth; // Trigger reflow
      this.welcomeScreen.style.animation = 'chatFadeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both';

      this.messagesContainer.style.display = 'none';
      return;
    }

    this.welcomeScreen.style.display = 'none';
    this.messagesContainer.style.display = 'flex';

    // Re-trigger entrance animation on message container
    this.messagesContainer.style.animation = 'none';
    void this.messagesContainer.offsetWidth; // Trigger reflow
    this.messagesContainer.style.animation = 'chatFadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both';

    for (const msg of messages) {
      this.appendMessageElement(msg, false);
    }
    this.scrollToBottom(true);
  }

  appendMessageElement(msg, animate = true) {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.id = msg.id;
    row.className = `message-row ${isUser ? 'message-user' : 'message-assistant'}`;
    if (!animate) {
      row.style.animation = 'none'; // Avoid multiple cascades on initial load
    }

    const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let filesHtml = '';
    if (msg.files && msg.files.length > 0) {
      filesHtml = `
        <div class="attachments-tray" style="margin-bottom: var(--space-2);">
          ${msg.files.map(f => `
            <span class="attachment-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>${escapeHtml(f.name)}</span>
            </span>
          `).join('')}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="message-avatar ${isUser ? 'message-avatar-user' : ''}">
        ${isUser ? 'U' : '<img src="../shared/assets/logo.svg" width="16" height="16" alt="Aether">'}
      </div>
      <div class="message-body">
        <div class="message-header">
          <span class="message-sender">${isUser ? 'You' : 'Aether'}</span>
          <span class="message-time">${formattedTime}</span>
        </div>
        ${filesHtml}
        <div class="message-content prose">${renderMarkdown(msg.content)}${msg.isStreaming ? '<span class="streaming-cursor"></span>' : ''}</div>
        <div class="message-actions" style="${msg.isStreaming ? 'display:none;' : ''}">
          <button class="btn btn-ghost btn-icon btn-icon-sm action-copy-btn" title="Copy text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          ${!isUser ? `
            <button class="btn btn-ghost btn-icon btn-icon-sm action-regenerate-btn" title="Regenerate response">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="btn btn-ghost btn-icon btn-icon-sm action-speak-btn" title="Read aloud">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
          ` : `
            <button class="btn btn-ghost btn-icon btn-icon-sm action-edit-btn" title="Edit and resend">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          `}
        </div>
      </div>
    `;

    this.messagesContainer.appendChild(row);
    this.bindMessageDynamicActions(row);
  }

  bindMessageDynamicActions(row) {
    row.querySelector('.action-copy-btn')?.addEventListener('click', () => {
      const content = row.querySelector('.message-content')?.innerText;
      if (content) {
        navigator.clipboard.writeText(content);
      }
    });

    $$('.copy-code-btn', row).forEach(btn => {
      btn.addEventListener('click', () => {
        const code = decodeURIComponent(btn.getAttribute('data-code') || '');
        if (code) {
          navigator.clipboard.writeText(code);
          btn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            btn.querySelector('span').textContent = 'Copy';
          }, 1800);
        }
      });
    });

    row.querySelector('.action-regenerate-btn')?.addEventListener('click', () => {
      this.engine.regenerateResponse();
    });

    row.querySelector('.action-speak-btn')?.addEventListener('click', () => {
      const text = row.querySelector('.message-content')?.innerText;
      if (text) {
        this.voice.speak(text);
      }
    });

    row.querySelector('.action-edit-btn')?.addEventListener('click', () => {
      const content = row.querySelector('.message-content')?.innerText;
      const newText = prompt('Edit your message:', content);
      if (newText !== null && newText.trim()) {
        this.engine.editAndResend(row.id, newText.trim());
      }
    });
  }
}
