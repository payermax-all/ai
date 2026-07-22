import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerOrderTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_query_orders',
    'Query sandbox orders by type: trade, pay, disburse, paylink, subscription. Two modes: (1) exact query with outTradeNo or payRequestNos, (2) recent records — returns the latest 5 orders before the specified time (defaults to now).',
    {
      type: z.enum(['trade', 'pay', 'disburse', 'paylink', 'subscription']).describe('Order type'),
      outTradeNo: z.string().optional().describe('External trade order number (exact query mode)'),
      payRequestNos: z.array(z.string()).optional().describe('Pay request numbers (exact query mode, for type=pay)'),
      subscriptionNo: z.string().optional().describe('Subscription number (for type=subscription)'),
      userId: z.string().optional().describe('User ID (for type=subscription)'),
      before: z.string().optional().describe('Query orders before this time (format: yyyy-MM-dd HH:mm:ss). Defaults to current time if omitted.'),
    },
    async ({ type, outTradeNo, payRequestNos, subscriptionNo, userId, before }) => {
      const body: Record<string, any> = {};
      if (outTradeNo) body.outTradeNo = outTradeNo;
      if (payRequestNos && payRequestNos.length > 0) body.payRequestNos = payRequestNos;
      if (subscriptionNo) body.subscriptionNo = subscriptionNo;
      if (userId) body.userId = userId;
      if (before) body.before = before;

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
      tradeOrderNo: z.string().describe('Trade order number'),
      type: z.string().describe('Notification type'),
    },
    async ({ tradeOrderNo, type }) => {
      await apiClient.post('/order/resend', { tradeOrderNo, type });
      return { content: [{ type: 'text' as const, text: 'Notification resent successfully.' }] };
    }
  );
}
