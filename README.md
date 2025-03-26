# Simple MCP Search Server

An MCP (Model Context Protocol) server implementation that provides search capabilities using Jina.ai APIs.

## Features

- `searchWeb`: Search the web for information
- `readPage`: Read and convert a webpage to markdown format
- `performDeepSearch`: Execute a deep, multi-step search with reasoning

## Prerequisites

- Node.js 18 or higher
- A valid Jina.ai API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example configuration:
   ```bash
   cp config.example.json config.json
   ```
4. Edit `config.json` and add your Jina.ai API key

## Usage

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start config.json
   ```

Or run in development mode:
```bash
npm run dev config.json
```

## Configuration

The server requires a JSON configuration file with the following structure:

```json
{
  "name": "simple-search-server",
  "version": "1.0.0",
  "apiKeys": {
    "jina": "YOUR_JINA_API_KEY"
  },
  "logLevel": "info"
}
```

## Tools

### searchWeb

Search the web for information using Jina's search API.

Input:
```typescript
{
  query: string;     // The search query
  site?: string;     // Optional: Domain to restrict the search to
}
```

### readPage

Read a webpage and convert it to markdown format.

Input:
```typescript
{
  url: string;       // URL of the webpage to read
}
```

### performDeepSearch

Perform a deep search on a topic, reading multiple pages and synthesizing information.

Input:
```typescript
{
  query: string;             // The search query for deep research
  reasoning_effort?: string; // Optional: Research intensity ("low", "medium", "high")
  no_direct_answer?: boolean; // Optional: Whether to avoid direct answers
}
``` 