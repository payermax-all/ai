import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';

export function registerAcceptanceTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_trigger_acceptance',
    'Trigger sandbox acceptance testing. Validates that the integration passes all required test cases.',
    {},
    async () => {
      const resp = await apiClient.post('/developer/acceptance/trigger', {});
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_get_acceptance_status',
    'Query the current sandbox acceptance testing status. Shows which test cases have passed and which are pending.',
    {},
    async () => {
      const resp = await apiClient.post('/developer/acceptance/status', {});
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );
}
