import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

/**
 * Dispute case status constants matching backend DisputeCaseStatusEnum.
 */
const STATUS = {
  INITIAL: 'INITIAL',
  DISPUTE_INQUIRY: 'DISPUTE_INQUIRY',
  DISPUTE_RECEIVED: 'DISPUTE_RECEIVED',
  DISPUTE_COMPLETED: 'DISPUTE_COMPLETED',
  CASE_CANCEL: 'CASE_CANCEL',
  CASE_CLOSED: 'CASE_CLOSED',
} as const;

const TERMINAL_STATUSES = [STATUS.DISPUTE_COMPLETED, STATUS.CASE_CANCEL, STATUS.CASE_CLOSED];

interface OrderInfo {
  payOrderNo: string;
  amount: number;
  currency: string;
}

interface CaseInfo {
  caseId: string | null;
  status: string | null;
  reasonCodes?: Array<{ value: string; label: string }>;
}

/**
 * Resolve order info (payOrderNo, amount, currency) from a merchant outTradeNo.
 */
async function resolveOrderInfo(apiClient: ApiClient, outTradeNo: string): Promise<OrderInfo> {
  const resp = await apiClient.post('/order/trade', { outTradeNo });
  const orders = resp.data as any[];
  if (!orders || orders.length === 0) {
    throw new Error(`No trade order found for outTradeNo: ${outTradeNo}`);
  }
  const order = orders[0];
  const payRequestNo = Array.isArray(order?.txnSptPayRequestNos)
    ? order.txnSptPayRequestNos[0]
    : null;
  if (!payRequestNo) {
    throw new Error(`Trade order found but has no payment request number. outTradeNo: ${outTradeNo}`);
  }
  return {
    payOrderNo: payRequestNo,
    amount: Number(order.txnOrdTotalAmount) || 0,
    currency: order.txnOrdCurrency || 'USD',
  };
}

/**
 * Query dispute case info by payOrderNo.
 */
async function queryCaseInfo(apiClient: ApiClient, payOrderNo: string): Promise<CaseInfo> {
  const resp = await apiClient.post('/dispute/case/query', { payOrderNo });
  const data = resp.data || {};
  return {
    caseId: data.caseId || null,
    status: data.status || null,
    reasonCodes: data.reasonCodes || [],
  };
}

/**
 * Sleep utility for polling.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll dispute case status until it matches one of the expected statuses.
 * Returns the case info on match, or throws after max retries.
 */
async function pollForStatus(
  apiClient: ApiClient,
  payOrderNo: string,
  expectedStatuses: string[],
  maxRetries = 3,
  intervalMs = 2000,
): Promise<CaseInfo> {
  for (let i = 0; i < maxRetries; i++) {
    await sleep(intervalMs);
    const info = await queryCaseInfo(apiClient, payOrderNo);
    if (info.status && expectedStatuses.includes(info.status)) {
      return info;
    }
  }
  const finalInfo = await queryCaseInfo(apiClient, payOrderNo);
  if (finalInfo.status && expectedStatuses.includes(finalInfo.status)) {
    return finalInfo;
  }
  throw new Error(
    `Dispute case status did not transition to [${expectedStatuses.join('|')}] after ${maxRetries} retries. ` +
    `Current status: ${finalInfo.status || 'unknown'}. Please wait and retry.`,
  );
}

export function registerDisputeTools(server: McpServer, apiClient: ApiClient) {
  // ================================================================
  // sandbox_dispute_query — unchanged input (outTradeNo), enhanced output
  // ================================================================
  server.tool(
    'sandbox_dispute_query',
    'Query dispute case information for a payment order identified by the merchant order number (outTradeNo). ' +
    'Returns case ID, current status, and available actions.',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
    },
    async ({ outTradeNo }) => {
      const { payOrderNo } = await resolveOrderInfo(apiClient, outTradeNo);
      const caseInfo = await queryCaseInfo(apiClient, payOrderNo);

      let nextAction = '';
      if (!caseInfo.caseId || !caseInfo.status || caseInfo.status === STATUS.INITIAL) {
        nextAction = 'Next: call sandbox_dispute_create to initiate a dispute.';
      } else if (caseInfo.status === STATUS.DISPUTE_INQUIRY) {
        nextAction = 'Next: call sandbox_dispute_reply to submit evidence and advance to closure.';
      } else if (caseInfo.status === STATUS.DISPUTE_RECEIVED) {
        nextAction = 'Next: call sandbox_dispute_close with sentenceResult="win" or "fail" to finalize.';
      } else if (TERMINAL_STATUSES.includes(caseInfo.status as any)) {
        nextAction = 'Dispute is already closed. Use a new order to initiate another dispute.';
      }

      const output = {
        outTradeNo,
        caseId: caseInfo.caseId,
        status: caseInfo.status,
        nextAction,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }] };
    },
  );

  // ================================================================
  // sandbox_dispute_create — frozenAmount/frozenCurrency now optional
  // ================================================================
  server.tool(
    'sandbox_dispute_create',
    'Create a mock dispute/chargeback case for a payment order identified by the merchant order number (outTradeNo). ' +
    'frozenAmount and frozenCurrency are optional — if omitted, they are automatically extracted from the order.',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
      disputeType: z.enum(['Dispute', 'Chargeback', 'Fraud', 'Customer Complaint'])
        .default('Dispute')
        .describe('Dispute type. Defaults to "Dispute".'),
      reason: z.string().optional().describe('Dispute reason. If omitted, the first available reason code is used.'),
      frozenAmount: z.number().optional().describe('Frozen amount. If omitted, uses the order total amount.'),
      frozenCurrency: z.string().optional().describe('Currency code (e.g. USD). If omitted, uses the order currency.'),
    },
    async (params) => {
      const orderInfo = await resolveOrderInfo(apiClient, params.outTradeNo);

      // Auto-fill frozenAmount/frozenCurrency from order if not provided
      const frozenAmount = params.frozenAmount ?? orderInfo.amount;
      const frozenCurrency = params.frozenCurrency || orderInfo.currency;

      // Auto-fill reason from available reason codes if not provided
      let reason = params.reason;
      if (!reason) {
        const caseInfo = await queryCaseInfo(apiClient, orderInfo.payOrderNo);
        reason = caseInfo.reasonCodes?.[0]?.value || '10.4';
      }

      const resp = await apiClient.post('/dispute/case/create', {
        payOrderNo: orderInfo.payOrderNo,
        disputeType: params.disputeType || 'Dispute',
        reason,
        frozenAmount,
        frozenCurrency,
      });

      const caseId = resp.data;
      const text =
        `Dispute case created successfully.\n` +
        `  Case ID: ${caseId}\n` +
        `  Status: ${STATUS.DISPUTE_INQUIRY}\n` +
        `  Next: call sandbox_dispute_reply with outTradeNo="${params.outTradeNo}" to submit evidence.`;
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  // ================================================================
  // sandbox_dispute_reply — input changed to outTradeNo (caseId optional for backward compat)
  // ================================================================
  server.tool(
    'sandbox_dispute_reply',
    'Reply to (defend against) a dispute case by submitting evidence. ' +
    'Use outTradeNo to identify the order; caseId is resolved automatically. ' +
    'Requires case status to be DISPUTE_INQUIRY.',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
      caseId: z.string().optional().describe('Dispute case ID (optional — auto-resolved from outTradeNo if omitted).'),
    },
    async (params) => {
      const { payOrderNo } = await resolveOrderInfo(apiClient, params.outTradeNo);
      const caseInfo = await queryCaseInfo(apiClient, payOrderNo);

      const caseId = params.caseId || caseInfo.caseId;
      if (!caseId) {
        throw new Error(
          `No dispute case found for outTradeNo: ${params.outTradeNo}. ` +
          `Please call sandbox_dispute_create first.`,
        );
      }

      // Status pre-check
      if (caseInfo.status && caseInfo.status !== STATUS.DISPUTE_INQUIRY) {
        if (TERMINAL_STATUSES.includes(caseInfo.status as any)) {
          throw new Error(`Dispute case ${caseId} is already closed (status: ${caseInfo.status}). Cannot reply.`);
        }
        if (caseInfo.status === STATUS.DISPUTE_RECEIVED) {
          throw new Error(
            `Dispute case ${caseId} has already been replied (status: DISPUTE_RECEIVED). ` +
            `Next: call sandbox_dispute_close with outTradeNo="${params.outTradeNo}" and sentenceResult="win" or "fail".`,
          );
        }
      }

      await apiClient.post('/dispute/case/reply', { caseId });

      const text =
        `Dispute case ${caseId} replied successfully.\n` +
        `  Status: ${STATUS.DISPUTE_RECEIVED}\n` +
        `  Next: call sandbox_dispute_close with outTradeNo="${params.outTradeNo}" and sentenceResult="win" or "fail" to finalize.`;
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  // ================================================================
  // sandbox_dispute_close — input changed to outTradeNo, sentenceResult enum
  // ================================================================
  server.tool(
    'sandbox_dispute_close',
    'Close a dispute case with a judgement result. ' +
    'Use outTradeNo to identify the order; caseId is resolved automatically. ' +
    'Requires case status to be DISPUTE_RECEIVED.',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
      sentenceResult: z.enum(['win', 'fail']).describe('Judgement: "win" (merchant wins) or "fail" (merchant loses).'),
      caseId: z.string().optional().describe('Dispute case ID (optional — auto-resolved from outTradeNo if omitted).'),
    },
    async (params) => {
      const { payOrderNo } = await resolveOrderInfo(apiClient, params.outTradeNo);
      const caseInfo = await queryCaseInfo(apiClient, payOrderNo);

      const caseId = params.caseId || caseInfo.caseId;
      if (!caseId) {
        throw new Error(
          `No dispute case found for outTradeNo: ${params.outTradeNo}. ` +
          `Please call sandbox_dispute_create first.`,
        );
      }

      // Status pre-check
      if (caseInfo.status && caseInfo.status !== STATUS.DISPUTE_RECEIVED) {
        if (TERMINAL_STATUSES.includes(caseInfo.status as any)) {
          throw new Error(`Dispute case ${caseId} is already closed (status: ${caseInfo.status}). Cannot close again.`);
        }
        if (caseInfo.status === STATUS.DISPUTE_INQUIRY) {
          throw new Error(
            `Dispute case ${caseId} is still in DISPUTE_INQUIRY status. ` +
            `Please call sandbox_dispute_reply with outTradeNo="${params.outTradeNo}" first.`,
          );
        }
      }

      await apiClient.post('/dispute/case/close', { caseId, sentenceResult: params.sentenceResult });

      const resultLabel = params.sentenceResult === 'win' ? 'Merchant wins' : 'Merchant loses';
      const text =
        `Dispute case ${caseId} closed successfully.\n` +
        `  Judgement: ${resultLabel}\n` +
        `  Final status: ${STATUS.DISPUTE_COMPLETED}\n` +
        `  Dispute flow completed.`;
      return { content: [{ type: 'text' as const, text }] };
    },
  );

  // ================================================================
  // sandbox_dispute_run_full_flow — orchestration tool (Plan A)
  // ================================================================
  server.tool(
    'sandbox_dispute_run_full_flow',
    'Run the complete dispute simulation flow (create → reply → close) in one call. ' +
    'Automatically handles state transitions and polling. Supports resuming from any intermediate state. ' +
    'If the dispute is already closed, reports the final status.',
    {
      outTradeNo: z.string().describe('Merchant order number (the order number you passed to PayerMax when creating the payment).'),
      sentenceResult: z.enum(['win', 'fail']).default('win')
        .describe('Final judgement result. Defaults to "win" (merchant wins).'),
      disputeType: z.enum(['Dispute', 'Chargeback', 'Fraud', 'Customer Complaint'])
        .default('Dispute')
        .describe('Dispute type for creation. Defaults to "Dispute".'),
    },
    async (params) => {
      const orderInfo = await resolveOrderInfo(apiClient, params.outTradeNo);
      let caseInfo = await queryCaseInfo(apiClient, orderInfo.payOrderNo);

      // Apply defaults (zod .default() may not apply if handler receives raw input)
      const disputeType = params.disputeType || 'Dispute';
      const sentenceResult = params.sentenceResult || 'win';

      const steps: string[] = [];

      // Check if already terminal
      if (caseInfo.status && TERMINAL_STATUSES.includes(caseInfo.status as any)) {
        return {
          content: [{
            type: 'text' as const,
            text:
              `Dispute for outTradeNo="${params.outTradeNo}" is already closed.\n` +
              `  Case ID: ${caseInfo.caseId}\n` +
              `  Status: ${caseInfo.status}\n` +
              `  Note: Test environment does not support re-initiation. Please use a new order number.`,
          }],
        };
      }

      // Step 1: Create (if needed)
      if (!caseInfo.caseId || !caseInfo.status || caseInfo.status === STATUS.INITIAL) {
        const reason = caseInfo.reasonCodes?.[0]?.value || '10.4';
        const resp = await apiClient.post('/dispute/case/create', {
          payOrderNo: orderInfo.payOrderNo,
          disputeType,
          reason,
          frozenAmount: orderInfo.amount,
          frozenCurrency: orderInfo.currency,
        });
        const caseId = resp.data;
        steps.push(`✅ Created dispute case: ${caseId}`);

        // Poll for DISPUTE_INQUIRY
        caseInfo = await pollForStatus(apiClient, orderInfo.payOrderNo, [STATUS.DISPUTE_INQUIRY]);
        steps.push(`✅ Status transitioned to: ${STATUS.DISPUTE_INQUIRY}`);
      } else if (caseInfo.status === STATUS.DISPUTE_INQUIRY) {
        steps.push(`⏩ Case ${caseInfo.caseId} already in ${STATUS.DISPUTE_INQUIRY}, skipping create`);
      } else if (caseInfo.status === STATUS.DISPUTE_RECEIVED) {
        steps.push(`⏩ Case ${caseInfo.caseId} already in ${STATUS.DISPUTE_RECEIVED}, skipping create+reply`);
      }

      // Step 2: Reply (if needed)
      if (caseInfo.status === STATUS.DISPUTE_INQUIRY) {
        await apiClient.post('/dispute/case/reply', { caseId: caseInfo.caseId });
        steps.push(`✅ Replied to dispute case: ${caseInfo.caseId}`);

        // Poll for DISPUTE_RECEIVED
        caseInfo = await pollForStatus(apiClient, orderInfo.payOrderNo, [STATUS.DISPUTE_RECEIVED]);
        steps.push(`✅ Status transitioned to: ${STATUS.DISPUTE_RECEIVED}`);
      }

      // Step 3: Close
      if (caseInfo.status === STATUS.DISPUTE_RECEIVED) {
        await apiClient.post('/dispute/case/close', {
          caseId: caseInfo.caseId,
          sentenceResult,
        });
        const resultLabel = sentenceResult === 'win' ? 'Merchant wins' : 'Merchant loses';
        steps.push(`✅ Closed dispute case. Judgement: ${resultLabel}`);
      }

      const text =
        `Dispute flow completed for outTradeNo="${params.outTradeNo}".\n` +
        `  Case ID: ${caseInfo.caseId}\n` +
        `  Final status: ${STATUS.DISPUTE_COMPLETED}\n` +
        `  Judgement: ${sentenceResult}\n\n` +
        `Steps:\n${steps.map((s) => `  ${s}`).join('\n')}`;

      return { content: [{ type: 'text' as const, text }] };
    },
  );
}
