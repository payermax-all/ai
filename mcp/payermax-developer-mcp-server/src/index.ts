import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TokenStore } from './auth/token-store.js';
import { ApiClient } from './api/client.js';
import { setCurrentVersion } from './api/version-check.js';
import { registerAuthTools } from './tools/authenticate.js';
import { registerSandboxConfigTool } from './tools/sandbox-config.js';
import { registerNotifyUrlTool } from './tools/notify-url.js';
import { registerPaymentMethodsTools } from './tools/payment-methods.js';
import { registerAcceptanceTools } from './tools/acceptance.js';
import { registerOrderTools } from './tools/orders.js';
import { registerDisputeTools } from './tools/dispute.js';
import { registerSubscriptionTools } from './tools/subscription.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

setCurrentVersion(pkg.version);

const tokenStore = new TokenStore();
const apiClient = new ApiClient(tokenStore);

const server = new McpServer(
  {
    name: 'payermax-developer',
    version: pkg.version,
  },
  {
    capabilities: {
      tools: { listChanged: true },
    },
  }
);

// Register all tools
registerAuthTools(server, tokenStore, apiClient);
registerSandboxConfigTool(server, apiClient);
registerNotifyUrlTool(server, apiClient);
registerPaymentMethodsTools(server, apiClient);
registerAcceptanceTools(server, apiClient);
registerOrderTools(server, apiClient);
registerDisputeTools(server, apiClient);
registerSubscriptionTools(server, apiClient);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
