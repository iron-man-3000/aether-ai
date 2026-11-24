/**
 * Shared API Client
 * Connects to the Aether backend and decodes Server-Sent Events (SSE) streaming chunks
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setBaseUrl(url) {
    this.baseUrl = url.replace(/\/$/, '');
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
      if (err.name === 'AbortError') {
        throw err;
      }
      throw new Error(`Failed to connect to Aether server: ${err.message}`);
    }

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) errorMsg = errorJson.error;
      } catch {
        // ignore fallback
      }
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by this browser/environment.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponseText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep unfinished line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // Ignore SSE comments/pings

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              return fullResponseText;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullResponseText += parsed.text;
                if (onToken) onToken(parsed.text, fullResponseText);
              }
              if (parsed.sources && onSources) {
                onSources(parsed.sources);
              }
              if (parsed.artifact && onArtifact) {
                onArtifact(parsed.artifact);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (jsonErr) {
              // If not JSON, it might be raw text
              if (!trimmed.includes('[DONE]')) {
                fullResponseText += dataStr;
                if (onToken) onToken(dataStr, fullResponseText);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponseText;
  }

  /**
   * Upload and process documents
   */
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

  /**
   * Fetch active server models
   */
  async getModels() {
    const res = await fetch(`${this.baseUrl}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  }
}
