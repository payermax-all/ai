import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerSubscriptionTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_subscription_mock_period',
    'Mock a subscription deduction period result (success or failure).',
    {
      subscriptionNo: z.string().describe('Subscription plan number'),
      orderNo: z.string().optional().describe('Deduction order number (optional)'),
      status: z.string().describe('Result: SUCCESS or FAILED'),
    },
    async ({ subscriptionNo, orderNo, status }) => {
      await apiClient.post('/subscription/mock/period', { subscriptionNo, orderNo, status });
      return { content: [{ type: 'text' as const, text: `Subscription ${subscriptionNo} period mocked as ${status}.` }] };
    }
  );

  server.tool(
    'sandbox_subscription_mock_resend',
    'Resend a subscription deduction notification for testing webhook handling.',
    {
      subscriptionNo: z.string().describe('Subscription plan number'),
      orderNo: z.string().describe('Deduction order number'),
    },
    async ({ subscriptionNo, orderNo }) => {
      await apiClient.post('/subscription/mock/deduction/resend', { subscriptionNo, orderNo });
      return { content: [{ type: 'text' as const, text: `Deduction resend triggered for subscription ${subscriptionNo}.` }] };
    }
  );
}
