# Simple MCP Search Server

This MCP server provides access to Jina AI search and scraping tools.

## Tools

- `searchWeb`: Search the web. Input: `{ query: string; site?: string; }`
- `scrapeUrl`: Scrape content from a URL. Input: `{ url: string; }`
- `performDeepSearch`: Perform a deep search using Jina AI. Input: `{ query: string; reasoning_effort?: 'low' | 'medium' | 'high'; no_direct_answer?: boolean; }`

## Configuration (`config.json`)

A `config.json` file is required. Refer to `src/config.ts` for the full schema (`ConfigSchema`).

```json
{
  "name": "simple-jina-mcp-server", // Server name for MCP discovery
  "version": "1.0.0",              // Server version
  "apiKeys": {
    "jina": "YOUR_JINA_API_KEY"  // Optional: Jina API key
  },
  "logLevel": "info",             // Optional: "debug", "info", "warn", "error" (default: "info")
  "transport": "http",           // Optional: "http" or "stdio" (default: "http")
  "port": 3123                   // Optional: Port for HTTP transport (default: 3123)
}
```

## Running

1.  Build: `npm run build`
2.  Run: `npm start config.json`

   - The server will start using the transport specified in `config.json` (`http` or `stdio`).
   - If using `http`, the endpoint is `http://localhost:<port>/mcp`. 