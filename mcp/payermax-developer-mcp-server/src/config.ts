/**
 * Production API base URL. This value must NOT be changed for local testing.
 * To point the server at a non-production environment, set the
 * PAYERMAX_MCP_API_BASE_URL environment variable in your MCP client config instead.
 */
export const PROD_API_BASE_URL = 'https://mmc-gateway-uat.payermax.com/developer-mcp/stdio';

export const CONFIG = {
  API_BASE_URL: process.env.PAYERMAX_MCP_API_BASE_URL || PROD_API_BASE_URL,
  CLIENT_ID: 'payermax-mcp-server',
  CREDENTIALS_DIR: '.payermax',
  CREDENTIALS_FILE: 'credentials.json',
  POLL_INTERVAL_MS: 5000,
  POLL_TIMEOUT_MS: 300000,
  VERIFICATION_URL_ALLOWED_HOSTNAMES: ['*.payermax.com'],
  ALLOW_INSECURE_LOCALHOST: false,
};
