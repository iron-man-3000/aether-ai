/**
 * Shared API Client
 * Connects to the Aether backend or operates serverlessly on GitHub Pages using direct OpenAI/Groq SSE
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.directApiKey = '';
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setApiKey(key) {
    this.directApiKey = key ? key.trim() : '';
  }

  /**
   * Send chat message and stream tokens back via callback
   */
  async streamChat({
    messages,
    model = 'gpt-4o',
    mode = 'general',
    style = 'concise',
    systemPrompt = '',
    webSearch = false,
    files = [],
    signal,
    onToken,
    onSources,
    onArtifact
  }) {
    const isDirectServerless = !this.baseUrl && this.directApiKey;

    if (isDirectServerless) {
      return this._streamDirect({
        messages,
        model,
        systemPrompt,
        signal,
        onToken
      });
    }

    const url = `${this.baseUrl}/api/chat`;
    const payload = {
      messages,
      model,
      mode,
      style,
      systemPrompt,
      webSearch,
      files
    };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;

      // If backend fails and we have a direct API key, fallback to direct streaming
      if (this.directApiKey) {
        return this._streamDirect({ messages, model, systemPrompt, signal, onToken });
      }

      throw new Error(`Failed to connect to Aether server (${url}). If running on GitHub Pages, add your API Key or backend URL in Settings.`);
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) errorMsg = errorJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return this._readSSEStream(response.body, onToken, onSources, onArtifact);
  }

  async _streamDirect({ messages, model, systemPrompt, signal, onToken }) {
    const isGroq = this.directApiKey.startsWith('gsk_');
    const apiUrl = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const targetModel = isGroq
      ? (model === 'gpt-4o-mini' ? 'openai/gpt-oss-20b' : 'openai/gpt-oss-120b')
      : (model || 'gpt-4o');

    const formattedMessages = [];
    if (systemPrompt) formattedMessages.push({ role: 'system', content: systemPrompt });
    for (const m of messages) formattedMessages.push({ role: m.role, content: m.content });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.directApiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: formattedMessages,
        stream: true
      }),
      signal
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error (${response.status}): ${err}`);
    }

    return this._readSSEStream(response.body, onToken);
  }

  async _readSSEStream(stream, onToken, onSources, onArtifact) {
    if (!stream) throw new Error('ReadableStream not supported.');

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponseText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') return fullResponseText;

            try {
              const parsed = JSON.parse(dataStr);
              const textChunk = parsed.text || parsed.choices?.[0]?.delta?.content;
              if (textChunk) {
                fullResponseText += textChunk;
                if (onToken) onToken(textChunk, fullResponseText);
              }
              if (parsed.sources && onSources) onSources(parsed.sources);
              if (parsed.artifact && onArtifact) onArtifact(parsed.artifact);
              if (parsed.error) throw new Error(parsed.error);
            } catch (err) {
              if (err.message && !err.message.includes('JSON')) throw err;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponseText;
  }

  async uploadFile(file, signal) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed with status ${response.status}`);
    }

    return response.json();
  }

  async getModels() {
    if (!this.baseUrl) {
      return {
        models: [
          { id: 'gpt-4o', name: 'Aether 4o', isDefault: true },
          { id: 'gpt-4o-mini', name: 'Aether Flash', isDefault: false }
        ]
      };
    }
    const res = await fetch(`${this.baseUrl}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  }
}
