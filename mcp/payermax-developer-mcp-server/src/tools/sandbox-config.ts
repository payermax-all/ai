import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerSandboxConfigTool(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'get_sandbox_config',
    'Get complete sandbox integration configuration including merchantNo, appId, RSA keypair, PayerMax public key, notify URL, and framework version. Returns all values needed to fill the integration config file.',
    {
      merchantNo: z.string().optional().describe('Optional. Specify merchant number if user has multiple sandbox merchants.'),
    },
    async ({ merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      const resp = await apiClient.get(`/developer/sandbox-config${params}`);
      const data = resp.data;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            merchantNo: data.merchantNo,
            appId: data.appId,
            memberId: data.memberId,
            email: data.email,
            merchantPublicKey: data.keys?.merchantPublicKey,
            merchantPrivateKey: data.keys?.merchantPrivateKey,
            payermaxPublicKey: data.keys?.payermaxPublicKey,
            keyType: data.keys?.keyType,
            keyVersion: data.keys?.keyVersion,
            notifyUrl: data.notifyUrl,
            frameworkVersion: data.frameworkVersion,
          }, null, 2)
        }]
      };
    }
  );
}
