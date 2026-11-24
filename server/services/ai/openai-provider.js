import { AIProviderInterface } from './ai-provider.interface.js';
import { ENV } from '../../config/env.js';

export class OpenAIProvider extends AIProviderInterface {
  constructor(apiKey = ENV.OPENAI_API_KEY) {
    super();
    this.apiKey = apiKey;

    // Auto-detect provider endpoint based on API key prefix
    if (this.apiKey && this.apiKey.startsWith('gsk_')) {
      this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      this.isGroq = true;
    } else {
      this.apiUrl = 'https://api.openai.com/v1/chat/completions';
      this.isGroq = false;
    }
  }

  mapModel(requestedModel) {
    if (this.isGroq) {
      // Map requested models to Groq's high-speed production models
      const groqMap = {
        'gpt-4o': 'openai/gpt-oss-120b',
        'gpt-4o-mini': 'openai/gpt-oss-20b',
        'o3-mini': 'openai/gpt-oss-120b',
        'qwen': 'qwen/qwen3.8-27b'
      };
      return groqMap[requestedModel] || requestedModel || 'openai/gpt-oss-120b';
    }
    return requestedModel || 'gpt-4o';
  }

  async streamChat({ messages, model = 'gpt-4o', systemPrompt = '', onToken, signal }) {
    if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
      const notice = `### Aether Server Ready\n\nTo connect to live AI models, set your API key in the \`.env\` file in the project directory and restart the server.`;
      for (const char of notice) {
        onToken(char);
        await new Promise(r => setTimeout(r, 8));
      }
      return notice;
    }

    const targetModel = this.mapModel(model);

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    const payload = {
      model: targetModel,
      messages: formattedMessages,
      stream: true
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Upstream AI API error: HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errMsg = parsed.error.message;
      } catch {}
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulated = '';

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
            if (dataStr === '[DONE]') {
              return accumulated;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                onToken(delta);
              }
            } catch {
              // Ignore partial chunk parsing
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
  }
}
