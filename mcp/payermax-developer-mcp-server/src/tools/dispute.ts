import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerDisputeTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_dispute_query',
    'Query dispute case information for a specific payment order.',
    {
      payOrderNo: z.string().describe('Payment order number'),
      merchantNo: z.string().describe('Merchant number'),
    },
    async ({ payOrderNo, merchantNo }) => {
      const resp = await apiClient.post('/dispute/case/query', { payOrderNo, merchantNo });
      return { content: [{ type: 'text' as const, text: JSON.stringify(resp.data, null, 2) }] };
    }
  );

  server.tool(
    'sandbox_dispute_create',
    'Create a mock dispute/chargeback case. disputeType: DISPUTE, CHARGEBACK, FRAUD, CUSTOMER_COMPLAINT.',
    {
      payOrderNo: z.string().describe('Payment order number to dispute'),
      merchantNo: z.string().describe('Merchant number'),
      disputeType: z.string().describe('Type: DISPUTE | CHARGEBACK | FRAUD | CUSTOMER_COMPLAINT'),
      reason: z.string().describe('Dispute reason'),
      frozenAmount: z.number().describe('Frozen amount'),
      frozenCurrency: z.string().describe('Currency code (e.g. USD)'),
    },
    async (params) => {
      const resp = await apiClient.post('/dispute/case/create', params);
      return { content: [{ type: 'text' as const, text: `Dispute case created. Case ID: ${resp.data}` }] };
    }
  );

  server.tool(
    'sandbox_dispute_reply',
    'Reply to (defend against) a dispute case.',
    {
      caseId: z.string().describe('Dispute case ID'),
      merchantNo: z.string().describe('Merchant number'),
    },
    async ({ caseId, merchantNo }) => {
      await apiClient.post('/dispute/case/reply', { caseId, merchantNo });
      return { content: [{ type: 'text' as const, text: `Dispute case ${caseId} replied successfully.` }] };
    }
  );

  server.tool(
    'sandbox_dispute_close',
    'Close a dispute case with a judgement result.',
    {
      caseId: z.string().describe('Dispute case ID'),
      sentenceResult: z.string().describe('Judgement: win or fail'),
      merchantNo: z.string().describe('Merchant number'),
    },
    async ({ caseId, sentenceResult, merchantNo }) => {
      await apiClient.post('/dispute/case/close', { caseId, sentenceResult, merchantNo });
      return { content: [{ type: 'text' as const, text: `Dispute case ${caseId} closed. Result: ${sentenceResult}` }] };
    }
  );
}
