import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerAcceptanceTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_trigger_acceptance',
    'Trigger sandbox acceptance testing. Validates that the integration passes all required test cases.',
    {
      merchantNo: z.string().optional().describe('Optional. Specify merchant number.'),
    },
    async ({ merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      const resp = await apiClient.post(`/developer/acceptance/trigger${params}`, {});
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_get_acceptance_status',
    'Query the current sandbox acceptance testing status. Shows which test cases have passed and which are pending.',
    {
      merchantNo: z.string().optional().describe('Optional. Specify merchant number.'),
    },
    async ({ merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      const resp = await apiClient.get(`/developer/acceptance/status${params}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );
}
