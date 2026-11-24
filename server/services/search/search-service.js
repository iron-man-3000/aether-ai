import { ENV } from '../../config/env.js';

export class SearchService {
  constructor(apiKey = ENV.TAVILY_API_KEY) {
    this.apiKey = apiKey;
  }

  async search(query) {
    if (!query) return [];

    if (!this.apiKey) {
      // Return structured search context when API key isn't provided
      return [
        {
          title: `Real-time search inquiry: "${query}"`,
          url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(query),
          snippet: `Live research ground on: ${query}. (Configure TAVILY_API_KEY in .env for full external web page retrieval).`
        }
      ];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          max_results: 5
        })
      });

      if (!response.ok) {
        console.warn('Search API failed:', response.status);
        return [];
      }

      const data = await response.json();
      return (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content
      }));
    } catch (err) {
      console.warn('Web search error:', err.message);
      return [];
    }
  }
}
