import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DeviceFlow } from '../auth/device-flow.js';
import { TokenStore } from '../auth/token-store.js';
import { ApiClient } from '../api/client.js';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

function openBrowser(url: string): void {
  const cmd = platform() === 'darwin' ? 'open' :
              platform() === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`, (err) => {
    if (err) process.stderr.write(`Failed to open browser: ${err.message}\n`);
  });
}

export function registerAuthTools(server: McpServer, tokenStore: TokenStore, apiClient: ApiClient) {
  const deviceFlow = new DeviceFlow();

  server.tool(
    'authenticate',
    'Initiate OAuth2 Device Flow authentication with PayerMax Developer Center. Returns a verification URL and code for the user to open in their browser.',
    {},
    async () => {
      // Check if already authenticated
      if (tokenStore.isValid()) {
        const creds = tokenStore.load()!;
        return { content: [{ type: 'text', text: `Already authenticated as ${creds.email || 'user'}. Token is valid until ${creds.expiresAt}.` }] };
      }

      // Request device code
      const response = await deviceFlow.requestDeviceCode();

      // Start background polling
      deviceFlow.startPolling(response.deviceCode).then(tokenResp => {
        const expiresAt = new Date(Date.now() + tokenResp.expiresIn * 1000).toISOString();
        tokenStore.save({
          accessToken: tokenResp.accessToken,
          expiresAt,
        });
      }).catch(err => {
        process.stderr.write(`Auth polling error: ${err.message}\n`);
      });

      // Auto-open browser for user convenience
      openBrowser(response.verificationUri);

      return {
        content: [{
          type: 'text',
          text: `Please open the following URL in your browser and enter the code to authorize:\n\n` +
                `URL: ${response.verificationUri}\n` +
                `Code: ${response.userCode}\n\n` +
                `The code expires in ${response.expiresIn} seconds.\n` +
                `After authorizing, run check_auth_status to confirm.`
        }]
      };
    }
  );

  server.tool(
    'check_auth_status',
    'Check if the OAuth2 Device Flow authentication has been completed by the user.',
    {},
    async () => {
      if (tokenStore.isValid()) {
        const creds = tokenStore.load()!;
        return { content: [{ type: 'text', text: `Authenticated${creds.email ? ` as ${creds.email}` : ''}. Token expires at ${creds.expiresAt}.` }] };
      }
      if (deviceFlow.isPolling()) {
        return { content: [{ type: 'text', text: 'Waiting for user authorization... Please complete the verification in your browser.' }] };
      }
      return { content: [{ type: 'text', text: 'Not authenticated. Please run authenticate first.' }] };
    }
  );

  server.tool(
    'revoke_token',
    'Revoke the current OAuth2 access token and clear local credentials. Use this to log out or when switching accounts.',
    {},
    async () => {
      const creds = tokenStore.load();
      if (!creds) {
        return { content: [{ type: 'text', text: 'No active token to revoke.' }] };
      }
      try {
        await apiClient.post('/oauth2/token/revoke');
      } catch {
        // Token might already be expired server-side
      }
      tokenStore.clear();
      return { content: [{ type: 'text', text: 'Token revoked and local credentials cleared.' }] };
    }
  );
}
