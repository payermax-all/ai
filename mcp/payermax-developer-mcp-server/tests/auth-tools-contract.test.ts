import { describe, expect, it, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../src/api/client.js';
import { createAuthenticateHandler, registerAuthTools } from '../src/tools/authenticate.js';
import type { DeviceCodeResponse, TokenResponse } from '../src/auth/device-flow.js';
import type { TokenStore } from '../src/auth/token-store.js';

type ToolHandler = (input: any) => Promise<{ content: Array<{ type: string; text: string }> }>;

function createToolHarness() {
  const tools = new Map<string, ToolHandler>();
  const tool = jest.fn((name: string, _description: string, _schema: object, handler: ToolHandler) => {
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

function tokenStoreMock(credentials: any = null, valid = false) {
  return {
    load: jest.fn<() => any>().mockReturnValue(credentials),
    isValid: jest.fn<() => boolean>().mockReturnValue(valid),
    save: jest.fn<(credentials: any) => void>(),
    clear: jest.fn<() => void>(),
  } as unknown as TokenStore;
}

describe('authentication MCP tools', () => {
  it('authenticate', async () => {
    // 1. 准备数据
    const response: DeviceCodeResponse = {
      deviceCode: 'device-001', userCode: 'ABCD-1234',
      verificationUriComplete: 'https://developer.payermax.com/oauth2/device?user_code=ABCD-1234',
      expiresIn: 300, interval: 5,
    };
    const token: TokenResponse = { accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 3600 };
    const store = tokenStoreMock();
    const requestDeviceCode = jest.fn<() => Promise<DeviceCodeResponse>>();
    const startPolling = jest.fn<(deviceCode: string, interval?: number) => Promise<TokenResponse>>();
    const browserOpener = jest.fn<(url: string) => Promise<boolean>>();
    // 2. mock Developer Center device-code/token API 和浏览器
    requestDeviceCode.mockResolvedValue(response);
    startPolling.mockResolvedValue(token);
    browserOpener.mockResolvedValue(true);
    const handler = createAuthenticateHandler(store, { requestDeviceCode, startPolling, isPolling: () => true }, browserOpener);
    // 3. 调用 MCP tool 接口
    const result = await handler();
    await new Promise(resolve => setImmediate(resolve));
    // 4. 校验 tool 返回及远端调用
    expect(requestDeviceCode).toHaveBeenCalledTimes(1);
    expect(startPolling).toHaveBeenCalledWith('device-001', 5);
    expect(browserOpener).toHaveBeenCalledWith(response.verificationUriComplete);
    expect(result.content[0].text).toContain('PayerMax authorization has started');
    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'access-token' }));
  });

  it('check_auth_status', async () => {
    // 1. 准备数据
    const credentials = {
      accessToken: 'access-token', expiresAt: '2099-01-01T00:00:00.000Z', email: 'dev@example.com',
    };
    const store = tokenStoreMock(credentials, true);
    const harness = createToolHarness();
    registerAuthTools(harness.server, store, harness.apiClient);
    // 2. mock 本地认证状态（该 tool 不调用远端 API）
    harness.post.mockRejectedValue(new Error('check_auth_status must not call Developer Center'));
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('check_auth_status').handler({});
    // 4. 校验 tool 返回及无远端调用
    expect(result.content[0].text).toBe(
      'Authenticated as dev@example.com. Token expires at 2099-01-01T00:00:00.000Z.',
    );
    expect(harness.post).not.toHaveBeenCalled();
  });

  it('revoke_token', async () => {
    // 1. 准备数据
    const credentials = { accessToken: 'access-token', expiresAt: '2099-01-01T00:00:00.000Z' };
    const store = tokenStoreMock(credentials, true);
    const harness = createToolHarness();
    registerAuthTools(harness.server, store, harness.apiClient);
    // 2. mock Developer Center revoke API
    harness.post.mockResolvedValue({ code: 'APPLY_SUCCESS' });
    // 3. 调用 MCP tool 接口
    const result = await harness.getTool('revoke_token').handler({});
    // 4. 校验 tool 返回、远端调用及本地清理
    expect(harness.post).toHaveBeenCalledWith('/oauth2/token/revoke');
    expect(store.clear).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toBe('Token revoked and local credentials cleared.');
  });
});
