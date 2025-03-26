import type { SearchWebInput, SearchResult, ReadPageInput, ReadPageResult, PerformDeepSearchInput, PerformDeepSearchResult } from './types.js';

export class JinaClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchWeb({ query, site }: SearchWebInput): Promise<SearchResult[]> {
    const url = new URL('https://s.jina.ai/');
    url.searchParams.set('q', query);

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Respond-With': 'no-content'
    };

    if (site) {
      headers['X-Site'] = site;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description,
      date: result.date
    }));
  }

  async readPage({ url }: ReadPageInput): Promise<ReadPageResult> {
    const apiUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to read page: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      title: data.title,
      description: data.description || '',
      url: data.url,
      content: data.content
    };
  }

  async performDeepSearch(input: PerformDeepSearchInput): Promise<PerformDeepSearchResult> {
    const response = await fetch('https://deepsearch.jina.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'jina-deepsearch-v1',
        messages: [
          {
            role: 'user',
            content: input.query
          }
        ],
        stream: true,
        reasoning_effort: input.reasoning_effort,
        no_direct_answer: input.no_direct_answer
      })
    });

    if (!response.ok) {
      throw new Error(`Deep search failed: ${response.statusText}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    let lastChunk: any = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;
          
          try {
            lastChunk = JSON.parse(jsonStr);
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }
    }

    if (!lastChunk) {
      throw new Error('No valid response received');
    }

    return {
      content: lastChunk.content,
      annotations: lastChunk.annotations,
      visitedURLs: lastChunk.visitedURLs,
      readURLs: lastChunk.readURLs
    };
  }
} 