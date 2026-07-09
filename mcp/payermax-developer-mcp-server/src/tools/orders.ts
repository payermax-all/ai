import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerOrderTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_query_orders',
    'Query sandbox orders by type: trade, pay, disburse, paylink, subscription. Returns paginated results.',
    {
      type: z.enum(['trade', 'pay', 'disburse', 'paylink', 'subscription']).describe('Order type'),
      merchantNo: z.string().describe('Merchant number'),
      outTradeNo: z.string().optional().describe('External trade order number (optional)'),
      subscriptionNo: z.string().optional().describe('Subscription number (for type=subscription)'),
      userId: z.string().optional().describe('User ID (for type=subscription)'),
      pageNo: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Page size (default 10)'),
    },
    async ({ type, merchantNo, outTradeNo, subscriptionNo, userId, pageNo, pageSize }) => {
      const body = type === 'subscription'
        ? { merchantNo, subscriptionNo, userId, pageNo, pageSize }
        : { merchantNo, outTradeNo, pageNo, pageSize };
      const resp = await apiClient.post(`/order/${type}`, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_query_subscription_detail',
    'Query deduction records for a specific subscription plan.',
    {
      subscriptionNo: z.string().describe('Subscription plan number'),
    },
    async ({ subscriptionNo }) => {
      const resp = await apiClient.post('/order/subscription/detail', { subscriptionNo });
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_resend_notification',
    'Resend webhook notification for a specific trade order.',
    {
      merchantNo: z.string().describe('Merchant number'),
      tradeOrderNo: z.string().describe('Trade order number'),
      type: z.string().describe('Notification type'),
    },
    async ({ merchantNo, tradeOrderNo, type }) => {
      await apiClient.post('/order/resend', { merchantNo, tradeOrderNo, type });
      return { content: [{ type: 'text' as const, text: 'Notification resent successfully.' }] };
    }
  );
}
