import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

export function registerNotifyUrlTool(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_configure_notify_url',
    'Configure the sandbox notification callback URL for receiving payment result notifications.',
    {
      notifyUrl: z.string().describe('The callback URL to receive payment notifications. Must be a valid HTTPS URL.'),
      merchantNo: z.string().optional().describe('Optional. Specify merchant number if user has multiple sandbox merchants.'),
    },
    async ({ notifyUrl, merchantNo }) => {
      const params = merchantNo ? `?merchantNo=${merchantNo}` : '';
      await apiClient.put(`/developer/notify-url${params}`, { notifyUrl });
      return { content: [{ type: 'text' as const, text: `Sandbox notify URL configured successfully: ${notifyUrl}` }] };
    }
  );
}
