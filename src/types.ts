import { z } from 'zod';

// Search Web Input Schema
export const SearchWebSchema = z.object({
  query: z.string().describe('The search query to find relevant information'),
  site: z.string().optional().describe('Optional: Domain to restrict the search to (e.g., "wikipedia.org")')
});

export type SearchWebInput = z.infer<typeof SearchWebSchema>;

// Search Web Output Schema
export const SearchWebOutputSchema = z.object({
  results: z.array(z.object({
    title: z.string().describe('Title of the search result'),
    url: z.string().describe('URL of the search result'),
    description: z.string().describe('Description or snippet of the search result'),
    date: z.string().optional().describe('Optional: Date when the content was published or indexed')
  }))
});

export type SearchWebOutput = z.infer<typeof SearchWebOutputSchema>;

// Scrape URL Input Schema
export const ScrapeUrlSchema = z.object({
  url: z.string().url().describe('URL of the webpage to scrape for content')
});

export type ScrapeUrlInput = z.infer<typeof ScrapeUrlSchema>;

// Scrape URL Output Schema
export const ScrapeUrlOutputSchema = z.object({
  content: z.string().describe('The scraped content from the webpage')
});

export type ScrapeUrlOutput = z.infer<typeof ScrapeUrlOutputSchema>;

// Deep Search Input Schema
export const PerformDeepSearchSchema = z.object({
  query: z.string().describe('The search query for deep research and analysis'),
  reasoning_effort: z.enum(['low', 'medium', 'high'])
    .optional()
    .describe('Optional: Level of reasoning effort to apply (low=quick, high=thorough)'),
  no_direct_answer: z.boolean()
    .optional()
    .describe('Optional: Whether to avoid providing direct answers and focus on research')
});

export type PerformDeepSearchInput = z.infer<typeof PerformDeepSearchSchema>;

// Deep Search Output Schema
export const PerformDeepSearchOutputSchema = z.object({
  content: z.string().describe('The main content of the deep search result'),
  annotations: z.array(z.object({
    type: z.string().describe('Type of annotation (e.g., "citation", "reference")'),
    url_citation: z.object({
      title: z.string().describe('Title of the cited content'),
      exactQuote: z.string().describe('Exact quote from the source'),
      url: z.string().describe('URL of the source'),
      dateTime: z.string().describe('DateTime when the content was accessed')
    }).optional()
  })).optional().describe('Optional: Annotations and citations from the research'),
  visitedURLs: z.array(z.string())
    .optional()
    .describe('Optional: List of URLs visited during the research'),
  readURLs: z.array(z.string())
    .optional()
    .describe('Optional: List of URLs that were fully read and analyzed')
});

export type PerformDeepSearchOutput = z.infer<typeof PerformDeepSearchOutputSchema>;

// Response Types (keeping these for backward compatibility with JinaClient)
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  date?: string;
  [key: string]: unknown;
}

export interface ScrapeUrlResult {
  content: string;
  [key: string]: unknown;
}

export interface URLCitation {
  title: string;
  exactQuote: string;
  url: string;
  dateTime: string;
  [key: string]: unknown;
}

export interface Annotation {
  type: string;
  url_citation?: URLCitation;
  [key: string]: unknown;
}

export interface PerformDeepSearchResult {
  content: string;
  annotations?: Annotation[];
  visitedURLs?: string[];
  readURLs?: string[];
  [key: string]: unknown;
} 