import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { loadConfig } from './config.js';
import { JinaClient } from './jina-client.js';
import { SearchWebSchema, ReadPageSchema, PerformDeepSearchSchema } from './types.js';

// Check for config file path
if (process.argv.length < 3) {
  console.error('Usage: node dist/index.js <config_file_path>');
  process.exit(1);
}

const configPath = process.argv[2];

async function runServer() {
  // Load configuration
  const config = await loadConfig(configPath);
  const jinaClient = new JinaClient(config.apiKeys.jina);

  // Initialize server
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'searchWeb',
          description: 'Search the web for information using Jina\'s search API.',
          inputSchema: zodToJsonSchema(SearchWebSchema),
        },
        {
          name: 'readPage',
          description: 'Read a webpage and convert it to markdown format.',
          inputSchema: zodToJsonSchema(ReadPageSchema),
        },
        {
          name: 'performDeepSearch',
          description: 'Perform a deep search on a topic, reading multiple pages and synthesizing information.',
          inputSchema: zodToJsonSchema(PerformDeepSearchSchema),
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    try {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'searchWeb': {
          const parsed = SearchWebSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for searchWeb: ${parsed.error}`);
          }
          const results = await jinaClient.searchWeb(parsed.data);
          return {
            content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
          };
        }

        case 'readPage': {
          const parsed = ReadPageSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for readPage: ${parsed.error}`);
          }
          const result = await jinaClient.readPage(parsed.data);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'performDeepSearch': {
          const parsed = PerformDeepSearchSchema.safeParse(args);
          if (!parsed.success) {
            throw new Error(`Invalid arguments for performDeepSearch: ${parsed.error}`);
          }
          const result = await jinaClient.performDeepSearch(parsed.data);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${config.name} v${config.version} MCP server running on stdio`);
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
}); 