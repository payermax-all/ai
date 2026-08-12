import { describe, expect, it, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../src/api/client.js';
import { registerSandboxConfigTool } from '../src/tools/sandbox-config.js';
import { registerKeypairTools } from '../src/tools/keypair.js';
import { registerNotifyUrlTool } from '../src/tools/notify-url.js';
import { registerPaymentMethodsTools } from '../src/tools/payment-methods.js';
import { registerAcceptanceTools } from '../src/tools/acceptance.js';
import { registerOrderTools } from '../src/tools/orders.js';
import { registerDisputeTools } from '../src/tools/dispute.js';
import { registerSubscriptionTools } from '../src/tools/subscription.js';

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

function expectJsonText(result: ToolResult, data: unknown): void {
  expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
}

describe('Developer Center backed MCP tools', () => {
  it('get_sandbox_config', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const apiData = {
      merchantNo: 'M001', appId: 'APP001', memberId: 'MEM001', email: 'dev@example.com',
      keys: { merchantPublicKey: 'merchant-public', payermaxPublicKey: 'payermax-public' },
      notifyUrl: 'https://merchant.example/notify', frameworkVersion: '2026-06',
    };
    registerSandboxConfigTool(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('get_sandbox_config').handler({});
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/sandbox-config', {});
    const output = JSON.parse(result.content[0].text);
    expect(output).toEqual(expect.objectContaining({ merchantNo: 'M001', keyType: 'RSA', keyVersion: '1' }));
    expect(output).not.toHaveProperty('merchantPrivateKey');
  });

  it('sandbox_generate_keypair', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = {};
    const apiData = { merchantPublicKey: 'public', merchantPrivateKey: 'private', keyType: 'RSA', keyVersion: '2' };
    registerKeypairTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_generate_keypair').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/keypair/generate', {});
    expect(JSON.parse(result.content[0].text)).toEqual(expect.objectContaining(apiData));
  });

  it('sandbox_upload_merchant_public_key', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { merchantPublicKey: 'base64-public-key' };
    registerKeypairTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_upload_merchant_public_key').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/keypair/upload', { merchantPublicKey: 'base64-public-key' });
    expect(result.content[0].text).toContain('uploaded successfully');
  });

  it('sandbox_configure_notify_url', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = {
      notifyUrls: [
        { notifyType: 'PAYMENT', notifyUrl: 'https://merchant.example/notify/payment' },
        { notifyType: 'REFUND', notifyUrl: 'https://merchant.example/notify/refund' },
      ],
    };
    registerNotifyUrlTool(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({
      code: 'APPLY_SUCCESS',
      data: {
        status: 'SUCCESS',
        succeeded: [
          { notifyType: 'PAYMENT', interfaceId: '4482', notifyUrl: 'https://merchant.example/notify/payment' },
          { notifyType: 'REFUND', interfaceId: '4483', notifyUrl: 'https://merchant.example/notify/refund' },
        ],
        failed: [],
      },
    });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_configure_notify_url').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/notify-url/update', input);
    expect(result.content[0].text).toContain('PAYMENT');
    expect(result.content[0].text).toContain('REFUND');
    expect(result.content[0].text).toContain('configured successfully');
  });

  it('sandbox_query_payment_methods', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const apiData = [{ transCode: 'TNG', enabled: true }];
    registerPaymentMethodsTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_query_payment_methods').handler({});
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/payment-methods', {});
    expectJsonText(result, apiData);
  });

  it('sandbox_update_payment_methods', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { changes: { '1001': { delSignIds: ['M1002023662716'], addSignIds: ['M100999894660'] } } };
    registerPaymentMethodsTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_update_payment_methods').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/payment-methods/update', input);
    expect(result.content[0].text).toBe('Sandbox payment methods updated successfully.');
  });

  it('sandbox_get_acceptance_status', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const apiData = {
      passTransCodes: ['1001'],
      passDetail: {
        'basic-gateway': ['orderAndPay-newArch', 'orderQuery-newArch'],
        'basic-notice': [],
      },
      prodMerchantNo: 'P010104145876927',
    };
    registerAcceptanceTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_get_acceptance_status').handler({});
    // 4. 校验 tool 返回
    expect(harness.post).toHaveBeenCalledWith('/developer/acceptance/status', {});
    const text = result.content[0].text;
    expect(text).toContain('Acquiring (1001): ✅ Passed');
    expect(text).toContain('orderAndPay: ✅');
    expect(text).toContain('orderQuery: ✅');
    expect(text).toContain('Payment notification: ✅');
    expect(text).toContain('Payout (1005): ❌ Pending');
    expect(text).toContain('P010104145876927');
  });

  it('sandbox_query_orders', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { type: 'pay', outTradeNo: 'TRADE-001', payRequestNos: ['PAY-001'] };
    const apiData = [{ outTradeNo: 'TRADE-001', status: 'SUCCESS' }];
    registerOrderTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_query_orders').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/order/pay', {
      outTradeNo: 'TRADE-001', payRequestNos: ['PAY-001'],
    });
    expectJsonText(result, apiData);
  });

  it('sandbox_query_subscription_detail', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { subscriptionNo: 'SUB-001' };
    const apiData = { subscriptionNo: 'SUB-001', deductions: [{ status: 'SUCCESS' }] };
    registerOrderTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_query_subscription_detail').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/order/subscription/detail', input);
    expectJsonText(result, apiData);
  });

  it('sandbox_resend_notification', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { tradeOrderNo: 'TRADE-001', type: 'PAYMENT' };
    registerOrderTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_resend_notification').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/order/resend', input);
    expect(result.content[0].text).toBe('Notification resent successfully.');
  });

  it('sandbox_dispute_query with outTradeNo', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-RESOLVED-001'], txnOrdOutTradeNo: 'MERCHANT-ORDER-001', txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_INQUIRY', reasonCodes: [] },
    });

    const result = await harness.getTool('sandbox_dispute_query').handler({ outTradeNo: 'MERCHANT-ORDER-001' });

    expect(harness.post).toHaveBeenCalledWith('/order/trade', { outTradeNo: 'MERCHANT-ORDER-001' });
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/query', { payOrderNo: 'PAY-RESOLVED-001' });
    const output = JSON.parse(result.content[0].text);
    expect(output.caseId).toBe('CASE-001');
    expect(output.status).toBe('DISPUTE_INQUIRY');
    expect(output.nextAction).toContain('sandbox_dispute_reply');
  });

  it('sandbox_dispute_create with outTradeNo', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '50', txnOrdCurrency: 'SGD' }],
    });
    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS', data: 'CASE-001' });

    const input = {
      outTradeNo: 'MY-ORDER-001', disputeType: 'Dispute' as const, reason: 'Product not received',
      frozenAmount: 12.5, frozenCurrency: 'USD',
    };
    const result = await harness.getTool('sandbox_dispute_create').handler(input);

    expect(harness.post).toHaveBeenCalledWith('/order/trade', { outTradeNo: 'MY-ORDER-001' });
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/create', {
      payOrderNo: 'PAY-001', disputeType: 'Dispute', reason: 'Product not received',
      frozenAmount: 12.5, frozenCurrency: 'USD',
    });
    expect(result.content[0].text).toContain('Case ID: CASE-001');
    expect(result.content[0].text).toContain('sandbox_dispute_reply');
  });

  it('sandbox_dispute_create auto-fills amount and currency from order', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    // /order/trade
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-002'], txnOrdTotalAmount: '99.99', txnOrdCurrency: 'EUR' }],
    });
    // /dispute/case/query (for reason code)
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: null, status: null, reasonCodes: [{ value: '10.4', label: 'Fraud' }] },
    });
    // /dispute/case/create
    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS', data: 'CASE-AUTO' });

    const input = { outTradeNo: 'MY-ORDER-002', disputeType: 'Chargeback' as const };
    const result = await harness.getTool('sandbox_dispute_create').handler(input);

    expect(harness.post).toHaveBeenCalledWith('/dispute/case/create', {
      payOrderNo: 'PAY-002', disputeType: 'Chargeback', reason: '10.4',
      frozenAmount: 99.99, frozenCurrency: 'EUR',
    });
    expect(result.content[0].text).toContain('CASE-AUTO');
  });

  it('sandbox_dispute_reply with outTradeNo', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    // /order/trade
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    // /dispute/case/query
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_INQUIRY' },
    });
    // /dispute/case/reply
    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS' });

    const result = await harness.getTool('sandbox_dispute_reply').handler({ outTradeNo: 'MY-ORDER-001' });

    expect(harness.post).toHaveBeenCalledWith('/dispute/case/reply', { caseId: 'CASE-001' });
    expect(result.content[0].text).toContain('CASE-001 replied successfully');
    expect(result.content[0].text).toContain('sandbox_dispute_close');
  });

  it('sandbox_dispute_reply with explicit caseId', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    // /order/trade
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    // /dispute/case/query
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_INQUIRY' },
    });
    // /dispute/case/reply
    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS' });

    const result = await harness.getTool('sandbox_dispute_reply').handler({ outTradeNo: 'MY-ORDER-001', caseId: 'CASE-EXPLICIT' });

    // When caseId is explicitly provided, it is used directly
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/reply', { caseId: 'CASE-EXPLICIT' });
    expect(result.content[0].text).toContain('CASE-EXPLICIT replied successfully');
  });

  it('sandbox_dispute_reply throws when no case exists', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: null, status: null },
    });

    await expect(harness.getTool('sandbox_dispute_reply').handler({ outTradeNo: 'MY-ORDER-001' }))
      .rejects.toThrow('No dispute case found');
  });

  it('sandbox_dispute_reply throws when status is not DISPUTE_INQUIRY', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_RECEIVED' },
    });

    await expect(harness.getTool('sandbox_dispute_reply').handler({ outTradeNo: 'MY-ORDER-001' }))
      .rejects.toThrow('already been replied');
  });

  it('sandbox_dispute_close with outTradeNo', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    // /order/trade
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    // /dispute/case/query
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_RECEIVED' },
    });
    // /dispute/case/close
    harness.post.mockResolvedValueOnce({ code: 'APPLY_SUCCESS' });

    const result = await harness.getTool('sandbox_dispute_close').handler({
      outTradeNo: 'MY-ORDER-001', sentenceResult: 'win',
    });

    expect(harness.post).toHaveBeenCalledWith('/dispute/case/close', { caseId: 'CASE-001', sentenceResult: 'win' });
    expect(result.content[0].text).toContain('CASE-001 closed successfully');
    expect(result.content[0].text).toContain('Merchant wins');
  });

  it('sandbox_dispute_close throws when status is DISPUTE_INQUIRY', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_INQUIRY' },
    });

    await expect(harness.getTool('sandbox_dispute_close').handler({
      outTradeNo: 'MY-ORDER-001', sentenceResult: 'fail',
    })).rejects.toThrow('sandbox_dispute_reply');
  });

  it('sandbox_dispute_close throws when case is already closed', async () => {
    const harness = createToolHarness();
    registerDisputeTools(harness.server, harness.apiClient);
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: [{ txnSptPayRequestNos: ['PAY-001'], txnOrdTotalAmount: '100', txnOrdCurrency: 'USD' }],
    });
    harness.post.mockResolvedValueOnce({
      code: 'APPLY_SUCCESS',
      data: { caseId: 'CASE-001', status: 'DISPUTE_COMPLETED' },
    });

    await expect(harness.getTool('sandbox_dispute_close').handler({
      outTradeNo: 'MY-ORDER-001', sentenceResult: 'win',
    })).rejects.toThrow('already closed');
  });

  it('sandbox_subscription_mock_period', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { subscriptionNo: 'SUB-001', orderNo: 'ORDER-001', status: 'SUCCESS' };
    registerSubscriptionTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_subscription_mock_period').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/subscription/mock/period', input);
    expect(result.content[0].text).toBe('Subscription SUB-001 period mocked as SUCCESS.');
  });

  it('sandbox_subscription_mock_resend', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { subscriptionNo: 'SUB-001', orderNo: 'ORDER-001' };
    registerSubscriptionTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_subscription_mock_resend').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/subscription/mock/deduction/resend', input);
    expect(result.content[0].text).toBe('Deduction resend triggered for subscription SUB-001.');
  });
});
