import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerPaymentMethodsTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_query_payment_methods',
    'Query the list of contracted payment methods in the sandbox environment.',
    {
      merchantNo: z.string().optional().describe('Optional. Specify merchant number if user has multiple sandbox merchants.'),
    },
    async ({ merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      const resp = await apiClient.get(`/developer/payment-methods${params}`);
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_update_payment_methods',
    'Enable or disable payment methods in the sandbox environment.',
    {
      changes: z.record(z.string(), z.any()).describe('Map of transCode to contract change details.'),
      merchantNo: z.string().optional().describe('Optional. Specify merchant number.'),
    },
    async ({ changes, merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      await apiClient.post(`/developer/payment-methods${params}`, { changes });
      return { content: [{ type: 'text' as const, text: 'Sandbox payment methods updated successfully.' }] };
    }
  );
}
