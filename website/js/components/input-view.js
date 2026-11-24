/**
 * Input View Component
 * Handles textarea auto-resizing, file uploads, drag-and-drop, speech recognition, and send/stop states
 */
import { $, escapeHtml } from '../../shared/utils/dom-helpers.js';
import { globalBus } from '../../shared/core/event-bus.js';
import { VoiceController } from '../../shared/utils/voice.js';

export class InputView {
  constructor({ chatEngine }) {
    this.engine = chatEngine;
    this.textarea = $('#chat-input');
    this.sendBtn = $('#send-btn');
    this.sendIcon = this.sendBtn?.querySelector('.send-icon');
    this.stopIcon = this.sendBtn?.querySelector('.stop-icon');
    this.attachBtn = $('#attach-btn');
    this.fileInput = $('#file-input');
    this.attachmentsTray = $('#attachments-tray');
    this.webSearchBtn = $('#web-search-toggle');
    this.voiceBtn = $('#voice-input-btn');
    this.modelSelect = $('#model-select');
    this.modeSelect = $('#mode-select');

    this.voice = new VoiceController();
    this.attachments = [];

    this.bindEvents();
  }

  bindEvents() {
    // Auto-resize input textarea
    this.textarea?.addEventListener('input', () => {
      this.textarea.style.height = 'auto';
      this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 200)}px`;
    });

    // Enter to send, Shift+Enter for new line
    this.textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendOrStop();
      }
    });

    // Send / Stop button click
    this.sendBtn?.addEventListener('click', () => {
      this.handleSendOrStop();
    });

    // Model & Mode selections
    this.modelSelect?.addEventListener('change', (e) => {
      this.engine.currentModel = e.target.value;
    });

    this.modeSelect?.addEventListener('change', (e) => {
      this.engine.currentMode = e.target.value;
    });

    // Web Search toggle
    this.webSearchBtn?.addEventListener('click', () => {
      this.engine.isWebSearchEnabled = !this.engine.isWebSearchEnabled;
      this.webSearchBtn.classList.toggle('active', this.engine.isWebSearchEnabled);
    });

    // Voice STT toggle
    this.voiceBtn?.addEventListener('click', () => {
      if (this.voice.isListening) {
        this.voice.stopListening();
        this.voiceBtn.classList.remove('listening');
      } else {
        this.voice.startListening({
          onResult: ({ final, interim }) => {
            if (final) {
              this.textarea.value = (this.textarea.value + ' ' + final).trim();
              this.textarea.dispatchEvent(new Event('input'));
            }
          },
          onEnd: () => {
            this.voiceBtn.classList.remove('listening');
          },
          onError: (err) => {
            this.voiceBtn.classList.remove('listening');
            console.warn('Voice recognition error:', err);
          }
        });
        this.voiceBtn.classList.add('listening');
      }
    });

    // File attachments
    this.attachBtn?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await this.processUploadedFile(file);
      }
      this.fileInput.value = '';
    });

    // Generation state updates
    globalBus.on('generation:started', () => {
      this.sendIcon.style.display = 'none';
      this.stopIcon.style.display = 'block';
      this.sendBtn.title = 'Stop generating';
    });

    globalBus.on('generation:stopped', () => {
      this.resetSendButton();
    });

    globalBus.on('message:completed', () => {
      this.resetSendButton();
    });
  }

  resetSendButton() {
    this.sendIcon.style.display = 'block';
    this.stopIcon.style.display = 'none';
    this.sendBtn.title = 'Send message';
  }

  async processUploadedFile(file) {
    try {
      const result = await this.engine.apiClient.uploadFile(file);
      this.attachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        text: result.text || ''
      });
      this.renderAttachments();
    } catch (err) {
      alert(`File upload failed: ${err.message}`);
    }
  }

  renderAttachments() {
    if (!this.attachmentsTray) return;
    this.attachmentsTray.innerHTML = this.attachments.map((att, i) => `
      <span class="attachment-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${escapeHtml(att.name)}</span>
        <button class="remove-file-btn" data-index="${i}">&times;</button>
      </span>
    `).join('');

    this.attachmentsTray.querySelectorAll('.remove-file-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        this.attachments.splice(idx, 1);
        this.renderAttachments();
      });
    });
  }

  handleSendOrStop() {
    if (this.engine.isGenerating) {
      this.engine.abortCurrentGeneration();
      return;
    }

    const text = this.textarea.value.trim();
    if (!text && this.attachments.length === 0) return;

    const files = [...this.attachments];
    this.attachments = [];
    this.renderAttachments();
    this.textarea.value = '';
    this.textarea.style.height = 'auto';

    this.engine.sendMessage(text, files);
  }
}
