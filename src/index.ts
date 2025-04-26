import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import { z } from 'zod'; // Needed for schema inference if not already imported

import { loadConfig, Config } from './config.js';
import { JinaClient } from './jina-client.js';
import { SearchWebSchema, ScrapeUrlSchema, PerformDeepSearchSchema } from './types.js'; // Updated import

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
  server.tool(
    'searchWeb',
    SearchWebSchema.shape,
    async (args: z.infer<typeof SearchWebSchema>) => {
      const results = await jinaClient.searchWeb(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // Tool: scrapeUrl (formerly readPage)
  server.tool(
    'scrapeUrl',
    ScrapeUrlSchema.shape,
    async (args: z.infer<typeof ScrapeUrlSchema>) => {
      const result = await jinaClient.scrapeUrl(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Tool: performDeepSearch
  server.tool(
    'performDeepSearch',
    PerformDeepSearchSchema.shape,
    async (args: z.infer<typeof PerformDeepSearchSchema>) => {
      const result = await jinaClient.performDeepSearch(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}

// --- runHttpServer Function ---
async function runHttpServer(config: Config, jinaClient: JinaClient) {
  const PORT = config.port; // Use port from config

  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req: Request, res: Response) => {
    console.log('Received POST /mcp');
    let server: McpServer | null = null;
    let transport: StreamableHTTPServerTransport | null = null;
    try {
      // Create instances per-request for stateless operation
      server = createMcpServer(config, jinaClient);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on('close', () => {
        console.log('Client connection closed, cleaning up.');
        transport?.close();
        server?.close();
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      transport?.close();
      server?.close();
      if (!res.headersSent) {
        const requestId = (req.body as any)?.id ?? null;
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: requestId,
        });
      }
    }
  });

	// Placeholder for GET - MCP Streamable HTTP doesn't typically use GET for main comms
	app.get("/mcp", (req: Request, res: Response) => {
		console.log("Received GET /mcp request (Method Not Allowed)");
		res.status(405).json({
			jsonrpc: "2.0",
			error: { code: -32601, message: "Method not found" }, // Method not found is more accurate than Not Allowed here
			id: null,
		});
	});

	// Placeholder for DELETE - MCP Streamable HTTP doesn't typically use DELETE
	app.delete("/mcp", (req: Request, res: Response) => {
		console.log("Received DELETE /mcp request (Method Not Allowed)");
		res.status(405).json({
			jsonrpc: "2.0",
			error: { code: -32601, message: "Method not found" },
			id: null,
		});
	});
  
  app.listen(PORT, () => {
    console.log(`MCP Server (${config.name} v${config.version}) listening on http://localhost:${PORT}/mcp`);
  });
}

// --- runStdioServer Function ---
async function runStdioServer(config: Config, jinaClient: JinaClient) {
  console.error(`Starting MCP Server (${config.name} v${config.version}) on stdio...`);

  const server = createMcpServer(config, jinaClient);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('MCP Server connected and running via stdio.');
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
  // Pass optional apiKey to JinaClient constructor
  const jinaClient = new JinaClient(config.apiKeys.jina);

  const transportType = config.transport;
  console.log(`Attempting to start MCP server with transport: ${transportType}`);

  if (transportType === 'http') {
    await runHttpServer(config, jinaClient);
  } else if (transportType === 'stdio') {
    await runStdioServer(config, jinaClient);
  } else {
    // This case should theoretically not be reached due to zod validation+default
    console.error(`Internal Error: Invalid transport type '${transportType}' detected after config load.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error during server startup:', error);
  process.exit(1);
}); 