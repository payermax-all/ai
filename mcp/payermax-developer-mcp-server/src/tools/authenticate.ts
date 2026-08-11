import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DeviceFlow, type DeviceCodeResponse, type TokenResponse } from '../auth/device-flow.js';
import { TokenStore } from '../auth/token-store.js';
import { ApiClient } from '../api/client.js';
import { resolveVerificationUrl } from '../auth/verification-url.js';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

type TextToolResult = {
  content: Array<{ type: 'text'; text: string }>;
};

interface AuthDeviceFlow {
  requestDeviceCode(): Promise<DeviceCodeResponse>;
  startPolling(deviceCode: string, intervalSeconds?: number): Promise<TokenResponse>;
  isPolling(): boolean;
}

type BrowserOpener = (url: string) => Promise<boolean>;

export function openBrowser(url: string): Promise<boolean> {
  const currentPlatform = platform();
  const command = currentPlatform === 'darwin'
    ? 'open'
    : currentPlatform === 'win32'
      ? 'rundll32.exe'
      : 'xdg-open';
  const args = currentPlatform === 'win32'
    ? ['url.dll,FileProtocolHandler', url]
    : [url];

  return new Promise(resolve => {
    const child = spawn(command, args, {
      shell: false,
      stdio: 'ignore',
    });
    let settled = false;
    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      resolve(opened);
    };
    child.once('error', error => {
      process.stderr.write(`Failed to open browser: ${error.message}\n`);
      finish(false);
    });
    child.once('close', code => {
      if (code !== 0) {
        process.stderr.write(`Failed to open browser (exit code ${code ?? 'unknown'}).\n`);
      }
      finish(code === 0);
    });
  });
}

export function createAuthenticateHandler(
  tokenStore: TokenStore,
  deviceFlow: AuthDeviceFlow,
  browserOpener: BrowserOpener = openBrowser,
): () => Promise<TextToolResult> {
  return async () => {
    if (tokenStore.isValid()) {
      const creds = tokenStore.load()!;
      return {
        content: [{
          type: 'text',
          text: `Already authenticated as ${creds.email || creds.userId || 'user'}. Token is valid until ${creds.expiresAt}.`,
        }],
      };
    }

    const response = await deviceFlow.requestDeviceCode();
    const verificationUrl = resolveVerificationUrl(response);

    deviceFlow.startPolling(response.deviceCode, response.interval).then(tokenResp => {
      const expiresAt = new Date(Date.now() + tokenResp.expiresIn * 1000).toISOString();
      tokenStore.save({
        accessToken: tokenResp.accessToken,
        expiresAt,
        email: tokenResp.email,
        userId: tokenResp.userId,
      });
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Auth polling error: ${message}\n`);
    });

    const opened = await browserOpener(verificationUrl);
    const text = opened
      ? `PayerMax authorization has started.\n\n` +
        `The browser should open automatically. Sign in if required.\n` +
        `Sandbox authorization completes automatically after sign-in.\n\n` +
        `Verification URL: ${verificationUrl}\n\n` +
        `After signing in, run check_auth_status.`
      : `The browser could not be opened automatically. Open the complete verification link below and sign in. ` +
        `Sandbox authorization completes automatically.\n\n` +
        `Verification URL: ${verificationUrl}\n\n` +
        `After signing in, run check_auth_status.`;

    return { content: [{ type: 'text', text }] };
  };
}

export function registerAuthTools(server: McpServer, tokenStore: TokenStore, apiClient: ApiClient) {
  const deviceFlow = new DeviceFlow();

  server.tool(
    'authenticate',
    'Initiate OAuth2 Device Flow authentication with PayerMax Developer Center. Opens the complete verification URL in the user browser.',
    {},
    createAuthenticateHandler(tokenStore, deviceFlow),
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
