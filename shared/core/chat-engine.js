/**
 * Core Chat Engine & State Machine
 * Coordinates messages, streaming lifecycle, aborting, regenerating, and persistence
 */
import { globalBus } from './event-bus.js';
import { CHAT_MODES, RESPONSE_STYLES } from './models-config.js';

export class ChatEngine {
  constructor({ apiClient, storageAdapter }) {
    this.apiClient = apiClient;
    this.storage = storageAdapter;

    this.currentConversation = null;
    this.isGenerating = false;
    this.abortController = null;

    // Active configurations
    this.currentModel = 'gpt-4o';
    this.currentMode = 'general';
    this.currentStyle = 'concise';
    this.isWebSearchEnabled = false;
    this.pendingAttachments = [];
  }

  async init() {
    await this.storage.init();
    const settings = await this.storage.getSettings();
    if (settings) {
      if (settings.model) this.currentModel = settings.model;
      if (settings.mode) this.currentMode = settings.mode;
      if (settings.style) this.currentStyle = settings.style;
    }

    // Try restoring last active conversation or create new
    const lastActiveId = await this.storage.getLastActiveConversationId();
    if (lastActiveId) {
      const conv = await this.storage.getConversation(lastActiveId);
      if (conv) {
        this.currentConversation = conv;
        globalBus.emit('conversation:loaded', conv);
        return;
      }
    }

    this.createNewConversation();
  }

  createNewConversation() {
    this.abortCurrentGeneration();
    this.currentConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: this.currentModel,
      mode: this.currentMode,
      style: this.currentStyle,
      messages: [],
      artifacts: []
    };
    this.pendingAttachments = [];
    globalBus.emit('conversation:created', this.currentConversation);
  }

  async switchConversation(id) {
    if (this.currentConversation?.id === id) return;
    this.abortCurrentGeneration();

    const conv = await this.storage.getConversation(id);
    if (conv) {
      this.currentConversation = conv;
      this.currentModel = conv.model || this.currentModel;
      this.currentMode = conv.mode || this.currentMode;
      this.currentStyle = conv.style || this.currentStyle;
      await this.storage.setLastActiveConversationId(id);
      globalBus.emit('conversation:loaded', conv);
    }
  }

  async deleteConversation(id) {
    await this.storage.deleteConversation(id);
    globalBus.emit('conversation:deleted', id);
    if (this.currentConversation?.id === id) {
      this.createNewConversation();
    }
  }

  async renameConversation(id, newTitle) {
    const conv = await this.storage.getConversation(id);
    if (conv) {
      conv.title = newTitle.trim() || 'Untitled Chat';
      conv.updatedAt = Date.now();
      await this.storage.saveConversation(conv);
      if (this.currentConversation?.id === id) {
        this.currentConversation.title = conv.title;
      }
      globalBus.emit('conversation:updated', conv);
    }
  }

  abortCurrentGeneration() {
    if (this.isGenerating && this.abortController) {
      this.abortController.abort();
      this.isGenerating = false;
      this.abortController = null;
      globalBus.emit('generation:stopped');
    }
  }

  /**
   * Send a user message and trigger streaming AI generation
   */
  async sendMessage(text, attachments = []) {
    if ((!text || !text.trim()) && (!attachments || attachments.length === 0)) return;
    if (this.isGenerating) return; // Prevent duplicate concurrent requests

    const userText = text.trim();
    const files = attachments.length > 0 ? attachments : [...this.pendingAttachments];
    this.pendingAttachments = [];

    // Auto-generate conversation title from first message
    if (this.currentConversation.messages.length === 0 && userText) {
      const summary = userText.slice(0, 36) + (userText.length > 36 ? '...' : '');
      this.currentConversation.title = summary;
    }

    const userMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: userText,
      files,
      timestamp: Date.now()
    };

    this.currentConversation.messages.push(userMessage);
    this.currentConversation.updatedAt = Date.now();
    globalBus.emit('message:added', userMessage);

    // Prepare optimistic assistant message
    const assistantMessage = {
      id: `msg_${Date.now() + 1}_a`,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: Date.now(),
      model: this.currentModel,
      isStreaming: true
    };

    this.currentConversation.messages.push(assistantMessage);
    globalBus.emit('message:added', assistantMessage);

    this.isGenerating = true;
    this.abortController = new AbortController();
    globalBus.emit('generation:started');

    try {
      // Assemble relevant memory and system instructions
      const modeConfig = CHAT_MODES[this.currentMode] || CHAT_MODES.general;
      const styleConfig = RESPONSE_STYLES[this.currentStyle] || RESPONSE_STYLES.concise;
      const memories = await this.storage.getMemories();
      let memoryContext = '';
      if (memories && memories.length > 0) {
        memoryContext = `\n[User Saved Preferences & Memories]:\n${memories.map(m => `- ${m.text}`).join('\n')}`;
      }

      const systemPrompt = `${modeConfig.systemPrompt}\n[Style Directive]: ${styleConfig.instruction}${memoryContext}`;

      // Build context window for API
      const contextMessages = this.currentConversation.messages
        .filter(m => m.id !== assistantMessage.id)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      await this.apiClient.streamChat({
        messages: contextMessages,
        model: this.currentModel,
        mode: this.currentMode,
        style: this.currentStyle,
        systemPrompt,
        webSearch: this.isWebSearchEnabled,
        files: userMessage.files,
        signal: this.abortController.signal,
        onToken: (chunk, fullText) => {
          assistantMessage.content = fullText;
          globalBus.emit('message:streaming', { id: assistantMessage.id, text: fullText });
        },
        onSources: (sources) => {
          assistantMessage.sources = sources;
          globalBus.emit('message:sources', { id: assistantMessage.id, sources });
        },
        onArtifact: (artifact) => {
          if (!this.currentConversation.artifacts) this.currentConversation.artifacts = [];
          this.currentConversation.artifacts.push(artifact);
          globalBus.emit('artifact:created', artifact);
        }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        assistantMessage.content += '\n\n*(Generation stopped by user)*';
      } else {
        assistantMessage.content += `\n\n**Error:** ${err.message}`;
        globalBus.emit('error', err.message);
      }
    } finally {
      assistantMessage.isStreaming = false;
      this.isGenerating = false;
      this.abortController = null;
      await this.storage.saveConversation(this.currentConversation);
      await this.storage.setLastActiveConversationId(this.currentConversation.id);
      globalBus.emit('message:completed', assistantMessage);
      globalBus.emit('conversation:saved', this.currentConversation);
    }
  }

  /**
   * Regenerate response for the last assistant turn
   */
  async regenerateResponse() {
    if (this.isGenerating) return;
    const messages = this.currentConversation.messages;
    if (messages.length === 0) return;

    // If last message is assistant, remove it
    if (messages[messages.length - 1].role === 'assistant') {
      const removed = messages.pop();
      globalBus.emit('message:removed', removed.id);
    }

    // Find the last user message to repeat
    const lastUserMsg = messages[messages.length - 1];
    if (!lastUserMsg || lastUserMsg.role !== 'user') return;

    // Pop user message as well and re-send it
    messages.pop();
    globalBus.emit('message:removed', lastUserMsg.id);
    await this.sendMessage(lastUserMsg.content, lastUserMsg.files);
  }

  /**
   * Edit an earlier user message and branch/continue conversation
   */
  async editAndResend(messageId, newContent) {
    if (this.isGenerating) return;
    const msgIndex = this.currentConversation.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Truncate messages after this point
    const removedMessages = this.currentConversation.messages.splice(msgIndex);
    for (const msg of removedMessages) {
      globalBus.emit('message:removed', msg.id);
    }

    await this.sendMessage(newContent);
  }
}
