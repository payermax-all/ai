import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { PROD_API_BASE_URL } from '../src/config.js';

describe('config', () => {
  const ENV_KEY = 'PAYERMAX_MCP_API_BASE_URL';

  afterEach(() => {
    delete process.env[ENV_KEY];
    jest.resetModules();
  });

  it('PROD_API_BASE_URL is the production endpoint', () => {
    expect(PROD_API_BASE_URL).toBe('https://mmc-gateway-uat.payermax.com/developer-mcp/stdio');
  });

  it('API_BASE_URL defaults to the production endpoint when env var is unset', async () => {
    delete process.env[ENV_KEY];
    jest.resetModules();
    const { CONFIG } = await import('../src/config.js');
    expect(CONFIG.API_BASE_URL).toBe(PROD_API_BASE_URL);
  });

  it('API_BASE_URL is overridden by PAYERMAX_MCP_API_BASE_URL', async () => {
    process.env[ENV_KEY] = 'https://mmc-gateway-dev-new.payermax.com/developer-mcp/stdio';
    jest.resetModules();
    const { CONFIG } = await import('../src/config.js');
    expect(CONFIG.API_BASE_URL).toBe('https://mmc-gateway-dev-new.payermax.com/developer-mcp/stdio');
  });
});
