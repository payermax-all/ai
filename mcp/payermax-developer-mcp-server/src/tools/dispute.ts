import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

/**
 * Resolve a payOrderNo from a merchant outTradeNo by querying /order/trade.
 */
async function resolvePayOrderNo(apiClient: ApiClient, outTradeNo: string): Promise<string> {
  const resp = await apiClient.post('/order/trade', { outTradeNo });
  const orders = resp.data as any[];
  if (!orders || orders.length === 0) {
    throw new Error(`No trade order found for outTradeNo: ${outTradeNo}`);
  }
  const payRequestNo = Array.isArray(orders[0]?.txnSptPayRequestNos)
    ? orders[0].txnSptPayRequestNos[0]
    : null;
  if (!payRequestNo) {
    throw new Error(`Trade order found but has no payment request number. outTradeNo: ${outTradeNo}`);
  }
  return payRequestNo;
}

export function registerDisputeTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_dispute_query',
    'Query dispute case information for a payment order identified by the merchant order number (outTradeNo).',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
    },
    async ({ outTradeNo }) => {
      const payOrderNo = await resolvePayOrderNo(apiClient, outTradeNo);
      const resp = await apiClient.post('/dispute/case/query', { payOrderNo });
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_dispute_create',
    'Create a mock dispute/chargeback case for a payment order identified by the merchant order number (outTradeNo).',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
      disputeType: z.string().describe('Type: DISPUTE | CHARGEBACK | FRAUD | CUSTOMER_COMPLAINT'),
      reason: z.string().describe('Dispute reason'),
      frozenAmount: z.number().describe('Frozen amount'),
      frozenCurrency: z.string().describe('Currency code (e.g. USD)'),
    },
    async (params) => {
      const payOrderNo = await resolvePayOrderNo(apiClient, params.outTradeNo);
      const resp = await apiClient.post('/dispute/case/create', {
        payOrderNo,
        disputeType: params.disputeType,
        reason: params.reason,
        frozenAmount: params.frozenAmount,
        frozenCurrency: params.frozenCurrency,
      });
      return { content: [{ type: 'text' as const, text: `Dispute case created. Case ID: ${resp.data}` }] };
    }
  );

  server.tool(
    'sandbox_dispute_reply',
    'Reply to (defend against) a dispute case.',
    {
      caseId: z.string().describe('Dispute case ID'),
    },
    async ({ caseId }) => {
      await apiClient.post('/dispute/case/reply', { caseId });
      return { content: [{ type: 'text' as const, text: `Dispute case ${caseId} replied successfully.` }] };
    }
  );

  server.tool(
    'sandbox_dispute_close',
    'Close a dispute case with a judgement result.',
    {
      caseId: z.string().describe('Dispute case ID'),
      sentenceResult: z.string().describe('Judgement: win (merchant wins) or fail (merchant loses)'),
    },
    async ({ caseId, sentenceResult }) => {
      await apiClient.post('/dispute/case/close', { caseId, sentenceResult });
      return { content: [{ type: 'text' as const, text: `Dispute case ${caseId} closed. Result: ${sentenceResult}` }] };
    }
  );
}
