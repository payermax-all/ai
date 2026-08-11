import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from '../api/client.js';

export function registerAcceptanceTools(server: McpServer, apiClient: ApiClient) {
  server.tool(
    'sandbox_get_acceptance_status',
    'Query and refresh sandbox acceptance testing status. Automatically checks for newly passed test cases and updates the result. Returns a structured summary showing which items have passed.',
    {},
    async () => {
      const resp = await apiClient.post('/developer/acceptance/status', {});
      console.error('[DEBUG acceptance] raw response:', JSON.stringify(resp));
      const data = resp.data || {};

      const passTransCodes: string[] = data.passTransCodes || [];
      const passDetail: Record<string, string[]> = data.passDetail || {};

      const acquiringPassed = passTransCodes.includes('1001');
      const payoutPassed = passTransCodes.includes('1005');

      const gatewayApis: string[] = passDetail['basic-gateway'] || [];
      const orderAndPayPassed = gatewayApis.includes('orderAndPay-newArch');
      const orderQueryPassed = gatewayApis.includes('orderQuery-newArch');
      const payoutOrderPassed = gatewayApis.includes('paymentOrderPay-newArch');
      const payoutQueryPassed = gatewayApis.includes('paymentOrderQry-newArch');
      const noticePassed = 'basic-notice' in passDetail;

      const lines = [
        '== Sandbox Acceptance Status ==',
        '',
        `Acquiring (1001): ${acquiringPassed ? '✅ Passed' : '❌ Pending'}`,
        `  - orderAndPay: ${orderAndPayPassed ? '✅' : '❌'}`,
        `  - orderQuery: ${orderQueryPassed ? '✅' : '❌'}`,
        `  - Payment notification: ${noticePassed ? '✅' : '❌'}`,
        '',
        `Payout (1005): ${payoutPassed ? '✅ Passed' : '❌ Pending'}`,
        `  - paymentOrderPay: ${payoutOrderPassed ? '✅' : '❌'}`,
        `  - paymentOrderQuery: ${payoutQueryPassed ? '✅' : '❌'}`,
      ];

      if (data.prodMerchantNo) {
        lines.push('', `Production merchantNo: ${data.prodMerchantNo}`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
