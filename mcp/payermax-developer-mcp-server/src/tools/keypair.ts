import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiClient } from '../api/client.js';

export function registerKeypairTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_generate_keypair',
    'Generate a new RSA keypair for the sandbox merchant. The public key is automatically uploaded to PayerMax platform. The private key is returned ONCE ONLY and is NOT saved on the server. ⚠️ Calling this will invalidate any previously uploaded public key.',
    {
      merchantNo: z.string().optional().describe('Merchant number (optional, defaults to token-bound merchant)'),
    },
    async ({ merchantNo }) => {
      const resp = await apiClient.post('/developer/keypair/generate', {
        merchantNo: merchantNo || undefined,
      });
      const data = resp.data;

      if (!data) {
        return { content: [{ type: 'text' as const, text: 'Failed to generate keypair. Ensure your account has a sandbox merchant.' }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            merchantPublicKey: data.merchantPublicKey,
            merchantPrivateKey: data.merchantPrivateKey,
            keyType: data.keyType,
            keyVersion: data.keyVersion,
            _warning: 'The private key is shown ONCE ONLY. Save it to your project config file immediately. It cannot be retrieved again.',
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'sandbox_upload_merchant_public_key',
    'Upload an existing merchant public key to PayerMax platform. Use this when you already have an RSA keypair and only need to register the public key with PayerMax for signature verification. ⚠️ This will overwrite the previously uploaded public key.',
    {
      merchantPublicKey: z.string().describe('Merchant RSA public key in Base64 single-line format (no PEM headers, no line breaks)'),
      merchantNo: z.string().optional().describe('Merchant number (optional, defaults to token-bound merchant)'),
    },
    async ({ merchantPublicKey, merchantNo }) => {
      await apiClient.post('/developer/keypair/upload', {
        merchantNo: merchantNo || undefined,
        merchantPublicKey,
      });

      return {
        content: [{
          type: 'text' as const,
          text: 'Merchant public key uploaded successfully. PayerMax will use this key to verify your request signatures.',
        }]
      };
    }
  );
}
