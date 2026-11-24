import { Router } from 'express';
import { chatLimiter } from '../middleware/rate-limiter.js';
import { validateChatPayload } from '../middleware/request-validator.js';
import { OpenAIProvider } from '../services/ai/openai-provider.js';
import { SearchService } from '../services/search/search-service.js';

export const chatRouter = Router();

const aiProvider = new OpenAIProvider();
const searchService = new SearchService();

chatRouter.post('/', chatLimiter, validateChatPayload, async (req, res, next) => {
  const { messages, model, systemPrompt, webSearch, files } = req.body;

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, etc.)
  res.flushHeaders?.();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let augmentedSystemPrompt = systemPrompt || '';

    // Handle Web Search if requested
    if (webSearch) {
      const lastUserQuery = messages[messages.length - 1]?.content || '';
      const searchResults = await searchService.search(lastUserQuery);

      if (searchResults.length > 0) {
        sendEvent({ sources: searchResults });
        augmentedSystemPrompt += `\n\n[Live Web Search Sources Grounding]:\n` +
          searchResults.map((r, i) => `[Source ${i + 1}]: "${r.title}" (${r.url})\nSummary: ${r.snippet}`).join('\n\n') +
          `\nAlways cite relevant sources with [Source X] when referencing this information.`;
      }
    }

    // Handle attached documents context
    if (files && Array.isArray(files) && files.length > 0) {
      augmentedSystemPrompt += `\n\n[Attached Document Context]:\n` +
        files.map(f => `--- File: ${f.name} ---\n${f.text}`).join('\n\n');
    }

    // Stream response from provider
    await aiProvider.streamChat({
      messages,
      model,
      systemPrompt: augmentedSystemPrompt,
      onToken: (token) => {
        sendEvent({ text: token });
      }
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      return next(err);
    }
    sendEvent({ error: err.message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
});
