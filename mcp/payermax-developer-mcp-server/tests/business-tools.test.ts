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
    const input = { merchantNo: 'M001' };
    const apiData = { merchantPublicKey: 'public', merchantPrivateKey: 'private', keyType: 'RSA', keyVersion: '2' };
    registerKeypairTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_generate_keypair').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/keypair/generate', input);
    expect(JSON.parse(result.content[0].text)).toEqual(expect.objectContaining(apiData));
  });

  it('sandbox_upload_merchant_public_key', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { merchantNo: 'M001', merchantPublicKey: 'base64-public-key' };
    registerKeypairTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_upload_merchant_public_key').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/keypair/upload', input);
    expect(result.content[0].text).toContain('uploaded successfully');
  });

  it('sandbox_configure_notify_url', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { notifyUrl: 'https://merchant.example/notify' };
    registerNotifyUrlTool(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_configure_notify_url').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/notify-url/update', input);
    expect(result.content[0].text).toBe(`Sandbox notify URL configured successfully: ${input.notifyUrl}`);
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
    const input = { changes: { TNG: { enabled: true }, CARD: { enabled: false } } };
    registerPaymentMethodsTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_update_payment_methods').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/payment-methods/update', input);
    expect(result.content[0].text).toBe('Sandbox payment methods updated successfully.');
  });

  it('sandbox_trigger_acceptance', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const apiData = { taskId: 'TASK-001', status: 'RUNNING' };
    registerAcceptanceTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_trigger_acceptance').handler({});
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/acceptance/trigger', {});
    expectJsonText(result, apiData);
  });

  it('sandbox_get_acceptance_status', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const apiData = { status: 'PARTIAL', passed: 3, pending: 2 };
    registerAcceptanceTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_get_acceptance_status').handler({});
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/developer/acceptance/status', {});
    expectJsonText(result, apiData);
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

  it('sandbox_dispute_query', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { payOrderNo: 'PAY-001' };
    const apiData = { caseId: 'CASE-001', status: 'OPEN' };
    registerDisputeTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: apiData });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_dispute_query').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/query', input);
    expectJsonText(result, apiData);
  });

  it('sandbox_dispute_create', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = {
      payOrderNo: 'PAY-001', disputeType: 'DISPUTE', reason: 'Product not received',
      frozenAmount: 12.5, frozenCurrency: 'USD',
    };
    registerDisputeTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS', data: 'CASE-001' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_dispute_create').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/create', input);
    expect(result.content[0].text).toBe('Dispute case created. Case ID: CASE-001');
  });

  it('sandbox_dispute_reply', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { caseId: 'CASE-001' };
    registerDisputeTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_dispute_reply').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/reply', input);
    expect(result.content[0].text).toBe('Dispute case CASE-001 replied successfully.');
  });

  it('sandbox_dispute_close', async () => {
    // 1. 准备数据
    const harness = createToolHarness();
    const input = { caseId: 'CASE-001', sentenceResult: 'win' };
    registerDisputeTools(harness.server, harness.apiClient);
    // 2. mock Developer Center API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('sandbox_dispute_close').handler(input);
    // 4. 校验 tool 返回及远端调用
    expect(harness.post).toHaveBeenCalledWith('/dispute/case/close', input);
    expect(result.content[0].text).toBe('Dispute case CASE-001 closed. Result: win');
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
