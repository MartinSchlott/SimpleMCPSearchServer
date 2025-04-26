import { z } from 'zod';

// Search Web Input Schema
export const SearchWebSchema = z.object({
  query: z.string().describe('The search query'),
  site: z.string().optional().describe('Optional: Domain to restrict the search to')
});

export type SearchWebInput = z.infer<typeof SearchWebSchema>;

// Scrape URL Input Schema (formerly Read Page)
export const ScrapeUrlSchema = z.object({
  url: z.string().url().describe('URL of the webpage to scrape')
});

export type ScrapeUrlInput = z.infer<typeof ScrapeUrlSchema>;

// Deep Search Input Schema
export const PerformDeepSearchSchema = z.object({
  query: z.string().describe('The search query for deep research'),
  reasoning_effort: z.enum(['low', 'medium', 'high']).optional().describe('Optional: Research intensity'),
  no_direct_answer: z.boolean().optional().describe('Optional: Whether to avoid direct answers')
});

export type PerformDeepSearchInput = z.infer<typeof PerformDeepSearchSchema>;

// Response Types
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  date?: string;
}

export interface ScrapeUrlResult { // Formerly ReadPageResult
  title: string;
  description: string;
  url: string;
  content: string;
}

export interface URLCitation {
  title: string;
  exactQuote: string;
  url: string;
  dateTime: string;
}

export interface Annotation {
  type: string;
  url_citation?: URLCitation;
}

export interface PerformDeepSearchResult {
  content: string;
  annotations?: Annotation[];
  visitedURLs?: string[];
  readURLs?: string[];
} 