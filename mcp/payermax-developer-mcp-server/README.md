# PayerMax Developer MCP Server

An MCP server that connects AI coding agents to PayerMax Developer Center.
Automate sandbox integration — auth, keypairs, config, payments, acceptance — without leaving your IDE.

## Prerequisites

- Node.js 18+
- An AI coding agent with MCP support (Cursor, Kiro, Claude Code, VS Code Copilot, etc.)

## Installation

### Option A: npm (Recommended)

Add to your IDE's MCP configuration:

```json
{
  "mcpServers": {
    "payermax-developer": {
      "command": "npx",
      "args": ["-y", "payermax-developer-mcp-server@latest"]
    }
  }
}
```

| IDE | Config file path |
|-----|-----------------|
| Cursor | `.cursor/mcp.json` |
| Kiro | `.kiro/settings/mcp.json` |
| Claude Code | `claude_desktop_config.json` |
| VS Code Copilot | `.vscode/mcp.json` (use `"type": "stdio"` format) |

### Option B: From source (GitHub)

```bash
git clone https://github.com/payermax-all/ai.git
cd ai/mcp/payermax-developer-mcp-server
npm install && npm run build
```

Then configure your IDE to use the local build:

```json
{
  "mcpServers": {
    "payermax-developer": {
      "command": "node",
      "args": ["/absolute/path/to/ai/mcp/payermax-developer-mcp-server/dist/index.js"]
    }
  }
}
```

## Getting Started

1. Add the MCP configuration above to your IDE.
2. Ask your AI agent: **"Authenticate with PayerMax Developer Center."**
3. Complete the authorization flow shown by PayerMax Developer Center. The agent normally opens the browser; if it cannot, copy the complete verification URL returned by the agent into your browser.
4. Done — all tools are now available.

## Works Best With PayerMax Integration Skill

This MCP Server is designed to work alongside the **PayerMax Integration Assistant** skill. Together they provide a fully automated integration experience:

| Component | Role |
|-----------|------|
| **Integration Skill** | Understands your requirements, generates solution docs, produces implementation code |
| **MCP Server** (this package) | Authenticates with Developer Center, manages keypairs, configures sandbox, runs acceptance |

**Recommended setup**: Install both for zero-manual-step integration.

→ [Install the Integration Skill](https://github.com/payermax-all/ai/tree/main/skills/payermax-integration-assistant)

## Available Tools (19)

| Tool | Description |
|------|-------------|
| `authenticate` | Initiate OAuth2 Device Flow authentication with PayerMax Developer Center |
| `check_auth_status` | Check if the OAuth2 Device Flow authentication has been completed |
| `revoke_token` | Revoke current access token and clear local credentials |
| `get_sandbox_config` | Get sandbox config (merchantNo, appId, merchant public key, PayerMax public key, notifyUrl). Does NOT return private key |
| `sandbox_generate_keypair` | Generate RSA keypair — public key auto-uploaded, private key returned once only |
| `sandbox_upload_merchant_public_key` | Upload an existing merchant public key to PayerMax |
| `sandbox_configure_notify_url` | Set sandbox callback notification URLs by type |
| `sandbox_query_payment_methods` | Query contracted payment methods |
| `sandbox_update_payment_methods` | Enable/disable payment methods |
| `sandbox_get_acceptance_status` | Query and refresh acceptance test status — automatically checks for newly passed cases |
| `sandbox_query_orders` | Query orders by type (trade, pay, disburse, paylink, subscription) — exact lookup or the latest 15 records. Note: `type=subscription` returns subscription **plans**, not deduction orders |
| `sandbox_query_subscription_detail` | Query all deduction orders (per-period transaction records) under a subscription plan |
| `sandbox_resend_notification` | Resend webhook notification for a trade order |
| `sandbox_dispute_query` | Query dispute case info for a payment order |
| `sandbox_dispute_create` | Create mock dispute/chargeback case (DISPUTE, CHARGEBACK, FRAUD, CUSTOMER_COMPLAINT) |
| `sandbox_dispute_reply` | Reply to (defend against) a dispute case |
| `sandbox_dispute_close` | Close a dispute case with a judgement result |
| `sandbox_subscription_mock_period` | Mock a subscription deduction period result (success/failure) |
| `sandbox_subscription_mock_resend` | Resend a subscription deduction notification |

## What Can I Ask My Agent?

Use natural-language requests. The agent selects the appropriate MCP tool and asks for any required identifier or configuration value.

### Authentication

```text
Authenticate with PayerMax Developer Center.

Check whether my PayerMax Developer Center session is authenticated.

Revoke my PayerMax Developer Center access token on this machine.
```

### Sandbox configuration and key management

```text
Show my sandbox merchant configuration.

Generate a new sandbox RSA keypair, upload its public key to PayerMax, and save the private key in my project configuration.

I already have an RSA keypair. Upload this merchant public key to PayerMax: <BASE64_PUBLIC_KEY>.

Set my sandbox notification URL to https://example.com/api/payermax/notify.
```

### Payment methods and acceptance

```text
Show the payment methods enabled for my sandbox merchant.

Enable the payment methods needed for card payments and TNG in my sandbox.

Run sandbox acceptance testing and show the result.

Show the current sandbox acceptance status.
```

### Orders and notifications

```text
Show the latest 15 sandbox trade orders.

Find the trade order whose merchant order number is TEST-e1e92e62-c4a.

Find the payment records for these payment request numbers: PAY_REQUEST_001, PAY_REQUEST_002.

Show my recent subscription plans.

Show all deduction orders for subscription plan SUB_001.

Resend the payment-success notification for trade order T202608030001.
```

Recent order queries return the latest **15** records ordered by creation time descending. Provide an order identifier when you need an exact lookup.

### Disputes and subscription simulations

```text
Find the dispute case for payment request PAY_REQUEST_001.

Create a mock DISPUTE case for payment request PAY_REQUEST_001.

Reply to dispute case CASE_001 with this defense and evidence summary: <SUMMARY>.

Close dispute case CASE_001 with the appropriate judgement result.

Simulate a successful deduction result for the next period of subscription SUB_001.

Resend the notification for subscription deduction order DEDUCT_001.
```

## Tool Safety

| Category | Tools | Guidance |
|----------|-------|----------|
| Read-only | Authentication status, sandbox configuration, payment-method query, acceptance status, order query, subscription-detail query, and dispute query | Safe for inspection; no sandbox state is changed. |
| Configuration changes | Keypair generation/upload, notification URL update, and payment-method updates | Confirm the intended merchant and configuration before proceeding. |
| Stateful sandbox actions | Token revocation, notification resend, dispute create/reply/close, and subscription mock/resend | Changes sandbox state or sends an event. Confirm the target identifier and intended result. |

## Key Management

`get_sandbox_config` does **not** return the merchant private key. Configure a keypair in one of these ways:

- **Auto-generate** — Ask your agent to call `sandbox_generate_keypair`. It generates an RSA 2048-bit keypair, uploads the public key to PayerMax, and returns the private key once. The private key is not stored server-side.
- **Use an existing keypair** — Put the matching private key in your project configuration, then ask your agent to call `sandbox_upload_merchant_public_key` with the public key.
- **Manual** — Upload the public key in [developer.payermax.com](https://developer.payermax.com) under Settings → Developer Info → Key Management.

> ⚠️ `sandbox_generate_keypair` and `sandbox_upload_merchant_public_key` overwrite the public key currently registered with PayerMax. The previous keypair becomes invalid. Ensure your project uses the private key matching the newly registered public key.
>
> ⚠️ A generated private key is returned **once only**. Save it securely immediately; it cannot be retrieved from PayerMax or this MCP server later.

## Versioning

- Server version follows [Semver](https://semver.org/)
- API compatibility enforced via `PayerMax-Integration-Mcp-Min-Version` response header
- If your server version is too low, tools will return an upgrade prompt
