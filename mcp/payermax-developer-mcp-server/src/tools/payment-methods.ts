import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

const contractChangeSchema = z.object({
  addSignIds: z.array(z.string()).optional().describe('signId list to enable (from sandbox_query_payment_methods response)'),
  delSignIds: z.array(z.string()).optional().describe('signId list to disable (from sandbox_query_payment_methods response)'),
  delAll: z.boolean().optional().describe('Set true to disable ALL payment methods under this transCode'),
});

export function registerPaymentMethodsTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_query_payment_methods',
    'Query the list of contracted payment methods in the sandbox environment. Returns a map of transCode to payment method list. Each payment method has a signId (unique identifier) and signContract (current status).',
    {},
    async () => {
      const resp = await apiClient.post('/developer/payment-methods', {});
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_update_payment_methods',
    'Enable or disable payment methods in the sandbox. The "changes" map key must be a transCode (1001=acquiring, 1002=payment-link, 1004=subscription, 1005=payout). The value specifies which signIds to add or remove. Get signIds from sandbox_query_payment_methods.',
    {
      changes: z.record(z.string(), contractChangeSchema)
        .describe('Map of transCode to change spec. Valid transCodes: 1001=acquiring, 1002=payment-link, 1004=subscription, 1005=payout. Example: {"1001": {"delSignIds": ["M1002023662716"]}}'),
    },
    async ({ changes }) => {
      await apiClient.post('/developer/payment-methods/update', { changes });
      return { content: [{ type: 'text' as const, text: 'Sandbox payment methods updated successfully.' }] };
    }
  );
}
