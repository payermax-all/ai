import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerOrderTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_query_orders',
    'Query sandbox orders by type: trade, pay, disburse, paylink, subscription. Two modes: (1) exact query with outTradeNo or payRequestNos, (2) recent records — returns the latest 15 orders sorted by creation time descending. IMPORTANT: type=subscription returns subscription PLANS (plan-level info), NOT individual deduction orders — use sandbox_query_subscription_detail to get the deduction orders under a plan.',
    {
      type: z.enum(['trade', 'pay', 'disburse', 'paylink', 'subscription'])
        .describe('Order type. Note: "subscription" returns SUBSCRIPTION PLANS (period count, amount, interval, status, signTime), NOT individual deduction orders. For deduction orders use sandbox_query_subscription_detail.'),
      outTradeNo: z.string().optional().describe('External trade order number (exact query mode)'),
      payRequestNos: z.array(z.string()).optional().describe('Pay request numbers (exact query mode, for type=pay)'),
      subscriptionNo: z.string().optional().describe('Subscription plan number (for type=subscription, filters to a specific plan)'),
      userId: z.string().optional().describe('User ID (for type=subscription)'),
    },
    async ({ type, outTradeNo, payRequestNos, subscriptionNo, userId }) => {
      const body: Record<string, any> = {};
      if (outTradeNo) body.outTradeNo = outTradeNo;
      if (payRequestNos && payRequestNos.length > 0) body.payRequestNos = payRequestNos;
      if (subscriptionNo) body.subscriptionNo = subscriptionNo;
      if (userId) body.userId = userId;

      const resp = await apiClient.post(`/order/${type}`, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_query_subscription_detail',
    'Query all deduction orders (individual transaction records) under a specific subscription plan. Each record represents one billing period, with orderNo, subscriptionIndex, status, amount, and period time range. Example: a 12-period plan with 5 periods paid returns 5 deduction order records. Use this after sandbox_query_orders(type=subscription) to drill down from a plan to its deduction orders. The returned orderNo can be used with sandbox_subscription_mock_resend.',
    {
      subscriptionNo: z.string().describe('Subscription plan number (e.g. SUB260806023642436402000246A04)'),
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
