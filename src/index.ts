import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response, Router, RequestHandler } from 'express';
import { z } from 'zod';

import { loadConfig, Config } from './config.js';
import { JinaClient } from './jina-client.js';
import { 
  SearchWebSchema, 
  SearchWebOutputSchema,
  ScrapeUrlSchema, 
  ScrapeUrlOutputSchema,
  PerformDeepSearchSchema, 
  PerformDeepSearchOutputSchema,
  SearchWebInput,
  ScrapeUrlInput,
  PerformDeepSearchInput
} from './types.js';

// --- createMcpServer Function ---
/**
 * Creates and configures the MCP server instance.
 */
function createMcpServer(config: Config, jinaClient: JinaClient): McpServer {
  const server = new McpServer({
    name: config.name,
    version: config.version,
  });

  // Tool: searchWeb
  server.registerTool(
    'searchWeb',
    {
      description: 'Search the web for information relevant to the query',
      inputSchema: SearchWebSchema.shape,
      outputSchema: SearchWebOutputSchema.shape,
      annotations: {
        title: "Web Search",
        readOnlyHint: true,
        idempotentHint: false, // Search results can change
        openWorldHint: true    // Interacts with external search service
      }
    },
    async (args: SearchWebInput) => {
      const results = await jinaClient.searchWeb(args);
      return {
        content: [], // Empty content array as per manual
        structuredContent: { results }
      };
    }
  );

  // Tool: scrapeUrl
  server.registerTool(
    'scrapeUrl',
    {
      description: 'Scrape a webpage for information relevant to the query',
      inputSchema: ScrapeUrlSchema.shape,
      outputSchema: ScrapeUrlOutputSchema.shape,
      annotations: {
        title: "Web Scraper",
        readOnlyHint: true,
        idempotentHint: false, // Content can change
        openWorldHint: true    // Interacts with external web
      }
    },
    async (args: ScrapeUrlInput) => {
      const result = await jinaClient.scrapeUrl(args);
      return {
        content: [], // Empty content array as per manual
        structuredContent: result
      };
    }
  );

  // Tool: performDeepSearch
  server.registerTool(
    'performDeepSearch',
    {
      description: 'Perform a deep search for information relevant to the query',
      inputSchema: PerformDeepSearchSchema.shape,
      outputSchema: PerformDeepSearchOutputSchema.shape,
      annotations: {
        title: "Deep Research",
        readOnlyHint: true,
        idempotentHint: false, // Results can change
        openWorldHint: true    // Interacts with external services
      }
    },
    async (args: PerformDeepSearchInput) => {
      const result = await jinaClient.performDeepSearch(args);
      return {
        content: [], // Empty content array as per manual
        structuredContent: result
      };
    }
  );

  return server;
}

// --- runHttpServer Function ---
async function runHttpServer(config: Config, jinaClient: JinaClient) {
  const PORT = config.port;

  const app = express();
  app.use(express.json());

  // Create persistent instances
  console.log("Creating MCP Server and Transport instances...");
  let server: McpServer | null = null;
  let transport: StreamableHTTPServerTransport | null = null;
  
  try {
    server = createMcpServer(config, jinaClient);
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await server.connect(transport);
    console.log("MCP Server connected to transport.");
  } catch (error) {
    console.error('FATAL: Could not initialize MCP Server or Transport:', error);
    process.exit(1);
  }

  // Create router for MCP endpoints
  const router = Router();

  // Main MCP endpoint
  const handleMcpRequest: RequestHandler = async (req, res) => {
    const requestId = (req.body as any)?.id ?? 'N/A';
    console.log(`Received POST /mcp (Request ID: ${requestId})`);

    if (!transport || !server) {
      console.error(`Error handling request ${requestId}: Transport or Server not initialized.`);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error: Server components not ready' },
        id: requestId
      });
      return;
    }

    try {
      await transport.handleRequest(req, res, req.body);
      console.log(`Finished handling request ID: ${requestId}`);
    } catch (error) {
      console.error(`Error handling MCP request ID: ${requestId}`, error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error during request handling' },
          id: requestId
        });
      }
    }
  };

  // Handle other methods
  const handleMethodNotAllowed: RequestHandler = (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id: null
    });
  };

  router.post('/', handleMcpRequest);
  router.get('/', handleMethodNotAllowed);
  router.delete('/', handleMethodNotAllowed);

  // Mount the router
  app.use('/mcp', router);

  // Start listening
  const listener = app.listen(PORT, () => {
    console.log(`MCP Server (${config.name} v${config.version}) listening on http://localhost:${PORT}/mcp`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('Shutdown signal received: closing MCP server and transport.');
    listener.close(async (err) => {
      if (err) {
        console.error("Error closing HTTP server:", err);
      }
      try {
        await transport?.close();
        await server?.close();
        console.log('MCP cleanup finished.');
        process.exit(err ? 1 : 0);
      } catch (shutdownErr) {
        console.error("Error during MCP cleanup:", shutdownErr);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// --- runStdioServer Function ---
async function runStdioServer(config: Config, jinaClient: JinaClient) {
  console.error(`Starting MCP Server (${config.name} v${config.version}) on stdio...`);

  const server = createMcpServer(config, jinaClient);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('MCP Server connected and running via stdio.');

  // Optional: Graceful shutdown for stdio
  const shutdownStdio = async () => {
    console.error('Shutdown signal received: closing MCP server and transport (stdio).');
    try {
      await transport?.close();
      await server?.close();
      console.error('MCP cleanup finished (stdio).');
      process.exit(0);
    } catch (shutdownErr) {
      console.error("Error during MCP cleanup (stdio):", shutdownErr);
      process.exit(1);
    }
  };

  process.on('SIGTERM', shutdownStdio);
  process.on('SIGINT', shutdownStdio);
}

// --- Main Execution Logic ---
async function main() {
  // Check for config file path
  if (process.argv.length < 3) {
    console.error('Usage: node dist/index.js <config_file_path>');
    process.exit(1);
  }
  const configPath = process.argv[2];

  // Load configuration
  const config = await loadConfig(configPath);
  const jinaClient = new JinaClient(config.apiKeys.jina);

  const transportType = config.transport;
  console.log(`Attempting to start MCP server with transport: ${transportType}`);

  if (transportType === 'http') {
    await runHttpServer(config, jinaClient);
  } else if (transportType === 'stdio') {
    await runStdioServer(config, jinaClient);
  } else {
    console.error(`Internal Error: Invalid transport type '${transportType}' detected after config load.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
}); 