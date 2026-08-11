import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';
import { z } from 'zod';

const httpsUrlSchema = z.string().url().refine(
  (value) => new URL(value).protocol === 'https:',
  'notifyUrl must use HTTPS',
);

const NOTIFY_TYPES = [
  'PAYMENT',
  'REFUND',
  'DISPUTE',
  'AUTHORIZATION',
  'ACCOUNT_SERVICE',
  'VA_COLLECTION',
  'PAYOUT',
  'SUBSCRIPTION',
  'TOP_UP',
  'RISK_BUSINESS_DATA_CALLBACK',
  'SUB_MERCHANT_REGISTRATION',
  'PAYMENT_LINK',
] as const;

export function registerNotifyUrlTool(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_configure_notify_url',
    'Configure one or more sandbox notification callback URLs by type. Accepts an array of { notifyType, notifyUrl } items (1–12). Use a single-item array for one type.',
    {
      notifyUrls: z.array(
        z.object({
          notifyType: z.enum(NOTIFY_TYPES).describe('Notification type, e.g. PAYMENT, REFUND, PAYOUT, SUBSCRIPTION.'),
          notifyUrl: httpsUrlSchema.describe('The HTTPS callback URL for this notification type.'),
        }),
      ).min(1).max(12).describe('Array of notification URL configurations.'),
    },
    async ({ notifyUrls }) => {
      const resp = await apiClient.post('/developer/notify-url/update', {
        notifyUrls,
      });

      const data = resp?.data;
      if (!data) {
        const lines = notifyUrls.map(
          (item) => `- ${item.notifyType}: ${item.notifyUrl}`,
        );
        return {
          content: [{
            type: 'text' as const,
            text: `Sandbox notification URLs configured successfully:\n${lines.join('\n')}`,
          }],
        };
      }

      if (data.status === 'SUCCESS') {
        const lines = (data.succeeded || []).map(
          (item: any) => `- ${item.notifyType}: ${item.notifyUrl}`,
        );
        return {
          content: [{
            type: 'text' as const,
            text: `Sandbox notification URLs configured successfully:\n${lines.join('\n')}`,
          }],
        };
      }

      // PARTIAL_FAILURE or FAILURE
      const succeededLines = (data.succeeded || []).map(
        (item: any) => `- ${item.notifyType}: ${item.notifyUrl}`,
      );
      const failedLines = (data.failed || []).map(
        (item: any) => `- ${item.notifyType}: ${item.reason}`,
      );

      let text = '';
      if (data.status === 'PARTIAL_FAILURE') {
        text = 'Sandbox notification URLs partially configured.\n';
      } else {
        text = 'Sandbox notification URLs configuration failed.\n';
      }
      if (succeededLines.length > 0) {
        text += `Succeeded:\n${succeededLines.join('\n')}\n`;
      }
      if (failedLines.length > 0) {
        text += `Failed:\n${failedLines.join('\n')}`;
      }

      return { content: [{ type: 'text' as const, text: text.trim() }] };
    },
  );
}
