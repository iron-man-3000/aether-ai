/**
 * AI Provider Abstract Interface
 */
export class AIProviderInterface {
  async streamChat({ messages, model, systemPrompt, onToken, signal }) {
    throw new Error('Not implemented');
  }
}
