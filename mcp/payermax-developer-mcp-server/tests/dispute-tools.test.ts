import { describe, expect, it, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../src/api/client.js';
import { registerDisputeTools } from '../src/tools/dispute.js';

type ToolResult = { content: Array<{ type: string; text: string }> };
type ToolHandler = (input: any) => Promise<ToolResult>;

function createToolHarness() {
  const tools = new Map<string, ToolHandler>();
  const tool = jest.fn((
    name: string,
    _description: string,
    _schema: Record<string, unknown>,
    handler: ToolHandler,
  ) => {
    tools.set(name, handler);
    return {};
  });
  const post = jest.fn<(path: string, body?: any) => Promise<any>>();
  return {
    server: { tool } as unknown as McpServer,
    apiClient: { post } as unknown as ApiClient,
    post,
    getTool(name: string) {
      const handler = tools.get(name);
      if (!handler) throw new Error(`Tool not registered: ${name}`);
      return { handler };
    },
  };
}

function mockOrderTrade(harness: ReturnType<typeof createToolHarness>, payOrderNo: string, amount = '100', currency = 'USD') {
  harness.post.mockResolvedValueOnce({
    code: 'APPLY_SUCCESS',
    data: [{ txnSptPayRequestNos: [payOrderNo], txnOrdTotalAmount: amount, txnOrdCurrency: currency }],
  });
}

function mockCaseQuery(harness: ReturnType<typeof createToolHarness>, caseId: string | null, status: string | null, reasonCodes: any[] = []) {
  harness.post.mockResolvedValueOnce({
    code: 'APPLY_SUCCESS',
    data: { caseId, status, reasonCodes },
  });
}

function mockSuccess(harness: ReturnType<typeof createToolHarness>, data?: any) {
  harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS', data });
}

describe('Dispute Tools - sandbox_dispute_run_full_flow', () => {
  it('runs full flow from scratch (create → reply → close)', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    // 1. /order/trade
    mockOrderTrade(harness, 'PAY-001', '200', 'SGD');
    // 2. /dispute/case/query (initial check - no case)
    mockCaseQuery(harness, null, null, [{ value: '10.4', label: 'Fraud' }]);
    // 3. /dispute/case/create
    mockSuccess(harness, 'CASE-FULL-001');
    // 4. poll /dispute/case/query → DISPUTE_INQUIRY
    mockCaseQuery(harness, 'CASE-FULL-001', 'DISPUTE_INQUIRY');
    // 5. /dispute/case/reply
    mockSuccess(harness);
    // 6. poll /dispute/case/query → DISPUTE_RECEIVED
    mockCaseQuery(harness, 'CASE-FULL-001', 'DISPUTE_RECEIVED');
    // 7. /dispute/case/close
    mockSuccess(harness);

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001', sentenceResult: 'win', disputeType: 'Dispute',
    });

    const text = result.content[0].text;
    expect(text).toContain('Dispute flow completed');
    expect(text).toContain('CASE-FULL-001');
    expect(text).toContain('DISPUTE_COMPLETED');
    expect(text).toContain('✅ Created dispute case');
    expect(text).toContain('✅ Replied to dispute case');
    expect(text).toContain('✅ Closed dispute case');
    expect(text).toContain('Merchant wins');

    // Verify API calls
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/create', {
      payOrderNo: 'PAY-001', disputeType: 'Dispute', reason: '10.4',
      frozenAmount: 200, frozenCurrency: 'SGD',
    });
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/reply', { caseId: 'CASE-FULL-001' });
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/close', { caseId: 'CASE-FULL-001', sentenceResult: 'win' });
  });

  it('resumes from DISPUTE_INQUIRY (skips create)', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    // Already in DISPUTE_INQUIRY
    mockCaseQuery(harness, 'CASE-RESUME-001', 'DISPUTE_INQUIRY');
    // reply
    mockSuccess(harness);
    // poll → DISPUTE_RECEIVED
    mockCaseQuery(harness, 'CASE-RESUME-001', 'DISPUTE_RECEIVED');
    // close
    mockSuccess(harness);

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001', sentenceResult: 'fail',
    });

    const text = result.content[0].text;
    expect(text).toContain('skipping create');
    expect(text).toContain('✅ Replied to dispute case');
    expect(text).toContain('Merchant loses');
    expect(harness.post).not.toHaveBeenCalledWith('/dispute/case/create', expect.anything());
  });

  it('resumes from DISPUTE_RECEIVED (skips create and reply)', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    // Already in DISPUTE_RECEIVED
    mockCaseQuery(harness, 'CASE-RESUME-002', 'DISPUTE_RECEIVED');
    // close
    mockSuccess(harness);

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001', sentenceResult: 'win',
    });

    const text = result.content[0].text;
    expect(text).toContain('skipping create+reply');
    expect(text).toContain('✅ Closed dispute case');
    expect(harness.post).not.toHaveBeenCalledWith('/dispute/case/create', expect.anything());
    expect(harness.post).not.toHaveBeenCalledWith('/dispute/case/reply', expect.anything());
  });

  it('returns early when case is already completed', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-DONE', 'DISPUTE_COMPLETED');

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001',
    });

    const text = result.content[0].text;
    expect(text).toContain('already closed');
    expect(text).toContain('CASE-DONE');
    expect(text).toContain('new order number');
  });

  it('returns early when case is cancelled', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-CANCEL', 'CASE_CANCEL');

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001',
    });

    expect(result.content[0].text).toContain('already closed');
  });

  it('defaults sentenceResult to win and disputeType to Dispute', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001', '50', 'EUR');
    mockCaseQuery(harness, null, null, [{ value: 'reason1', label: 'Reason 1' }]);
    mockSuccess(harness, 'CASE-DEFAULT');
    mockCaseQuery(harness, 'CASE-DEFAULT', 'DISPUTE_INQUIRY');
    mockSuccess(harness);
    mockCaseQuery(harness, 'CASE-DEFAULT', 'DISPUTE_RECEIVED');
    mockSuccess(harness);

    const result = await harness.getTool('sandbox_dispute_run_full_flow').handler({
      outTradeNo: 'ORDER-001',
    });

    expect(harness.post).toHaveBeenCalledWith('/dispute/case/create', expect.objectContaining({
      disputeType: 'Dispute', reason: 'reason1', frozenAmount: 50, frozenCurrency: 'EUR',
    }));
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/close', expect.objectContaining({
      sentenceResult: 'win',
    }));
    expect(result.content[0].text).toContain('win');
  });
});

describe('Dispute Tools - sandbox_dispute_query enhanced output', () => {
  it('suggests create when no case exists', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, null, null);

    const result = await harness.getTool('sandbox_dispute_query').handler({ outTradeNo: 'ORDER-001' });
    const output = JSON.parse(result.content[0].text);

    expect(output.nextAction).toContain('sandbox_dispute_create');
  });

  it('suggests close when status is DISPUTE_RECEIVED', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-001', 'DISPUTE_RECEIVED');

    const result = await harness.getTool('sandbox_dispute_query').handler({ outTradeNo: 'ORDER-001' });
    const output = JSON.parse(result.content[0].text);

    expect(output.nextAction).toContain('sandbox_dispute_close');
    expect(output.nextAction).toContain('win');
  });

  it('reports closed when terminal status', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-001', 'DISPUTE_COMPLETED');

    const result = await harness.getTool('sandbox_dispute_query').handler({ outTradeNo: 'ORDER-001' });
    const output = JSON.parse(result.content[0].text);

    expect(output.nextAction).toContain('already closed');
  });
});

describe('Dispute Tools - error handling', () => {
  it('sandbox_dispute_create throws when no order found', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS', data: [] });

    await expect(harness.getTool('sandbox_dispute_create').handler({
      outTradeNo: 'NON-EXISTENT',
    })).rejects.toThrow('No trade order found');
  });

  it('sandbox_dispute_reply throws when case is already closed', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-001', 'DISPUTE_COMPLETED');

    await expect(harness.getTool('sandbox_dispute_reply').handler({ outTradeNo: 'ORDER-001' }))
      .rejects.toThrow('already closed');
  });

  it('sandbox_dispute_close with explicit caseId uses it directly', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);

    mockOrderTrade(harness, 'PAY-001');
    mockCaseQuery(harness, 'CASE-001', 'DISPUTE_RECEIVED');
    mockSuccess(harness);

    const result = await harness.getTool('sandbox_dispute_close').handler({
      outTradeNo: 'ORDER-001', sentenceResult: 'fail', caseId: 'CASE-EXPLICIT',
    });

    expect(harness.post).toHaveBeenCalledWith('/dispute/case/close', { caseId: 'CASE-EXPLICIT', sentenceResult: 'fail' });
    expect(result.content[0].text).toContain('CASE-EXPLICIT');
    expect(result.content[0].text).toContain('Merchant loses');
  });
});
