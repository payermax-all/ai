import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';

export function registerSandboxConfigTool(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'get_sandbox_config',
    'Get sandbox integration configuration including merchantNo, appId, the currently uploaded merchant public key, PayerMax public key, notify URL, and framework version. Does NOT return merchantPrivateKey — use sandbox_generate_keypair to generate a new keypair.',
    {},
    async () => {
      const resp = await apiClient.post('/developer/sandbox-config', {});
      const data = resp.data;

      if (!data) {
        return { content: [{ type: 'text' as const, text: 'No sandbox configuration found. Ensure your account has a sandbox merchant bound in Developer Center.' }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            merchantNo: data.merchantNo,
            appId: data.appId,
            memberId: data.memberId,
            email: data.email,
            merchantPublicKey: data.keys?.merchantPublicKey,
            payermaxPublicKey: data.keys?.payermaxPublicKey,
            keyType: data.keys?.keyType ?? 'RSA',
            keyVersion: data.keys?.keyVersion ?? '1',
            notifyUrl: data.notifyUrl,
            frameworkVersion: data.frameworkVersion,
            _note: 'merchantPrivateKey is not returned here. Use sandbox_generate_keypair to generate a new keypair.',
          }, null, 2)
        }]
      };
    }
  );
}
