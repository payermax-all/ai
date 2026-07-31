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

1. Add the MCP configuration above to your IDE
2. Ask your AI agent: **"Authenticate with PayerMax Developer Center"**
3. The browser opens PayerMax Developer Center automatically. Sign in if required; sandbox authorization completes automatically after sign-in.
   If the browser cannot be opened, copy the complete verification URL returned by the agent into your browser.
4. Done — all tools are now available

## Works Best With PayerMax Integration Skill

This MCP Server is designed to work alongside the **PayerMax Integration Assistant** skill. Together they provide a fully automated integration experience:

| Component | Role |
|-----------|------|
| **Integration Skill** | Understands your requirements, generates solution docs, produces implementation code |
| **MCP Server** (this package) | Authenticates with Developer Center, manages keypairs, configures sandbox, runs acceptance |

**Recommended setup**: Install both for zero-manual-step integration.

→ [Install the Integration Skill](https://github.com/payermax-all/ai/tree/main/skills/payermax-integration-assistant)

## Available Tools (20)

| Tool | Description |
|------|-------------|
| `authenticate` | Initiate OAuth2 Device Flow authentication |
| `check_auth_status` | Check if authentication is complete |
| `revoke_token` | Revoke current access token |
| `get_sandbox_config` | Get sandbox config (merchantNo, appId, keys, notifyUrl) |
| `sandbox_generate_keypair` | Generate RSA keypair (public key auto-uploaded, private key returned once) |
| `sandbox_upload_merchant_public_key` | Upload an existing public key to PayerMax |
| `sandbox_configure_notify_url` | Set sandbox callback notification URL |
| `sandbox_query_payment_methods` | Query contracted payment methods |
| `sandbox_update_payment_methods` | Enable/disable payment methods |
| `sandbox_trigger_acceptance` | Trigger acceptance testing |
| `sandbox_get_acceptance_status` | Query acceptance test results |
| `sandbox_query_orders` | Query orders (trade, pay, disburse, paylink, subscription) |
| `sandbox_query_subscription_detail` | Query subscription deduction records |
| `sandbox_resend_notification` | Resend webhook notification |
| `sandbox_dispute_query` | Query dispute case info |
| `sandbox_dispute_create` | Create mock dispute/chargeback case |
| `sandbox_dispute_reply` | Reply to a dispute case |
| `sandbox_dispute_close` | Close a dispute case |
| `sandbox_subscription_mock_period` | Mock subscription billing period |
| `sandbox_subscription_mock_resend` | Resend subscription deduction notification |

## Key Management

`get_sandbox_config` does **not** return the merchant private key. To configure keypairs:

- **Auto-generate** — Ask your agent to call `sandbox_generate_keypair`. Generates a new RSA 2048-bit keypair, uploads the public key to PayerMax, and returns the private key once (not stored server-side).
- **Use existing keypair** — Place your private key in your project config, then ask your agent to call `sandbox_upload_merchant_public_key` with your public key.
- **Manual** — Upload your public key via [developer.payermax.com](https://developer.payermax.com) (Settings → Developer Info → Key Management).

> ⚠️ Each call to `sandbox_generate_keypair` or `sandbox_upload_merchant_public_key` overwrites the previously uploaded public key. Old keypairs become invalid.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYERMAX_ENV` | `sandbox` | Environment (`sandbox` only for now) |
| `PAYERMAX_ALLOW_HTTP_LOCALHOST` | `false` | Allow `http://localhost` verification URLs for explicit local testing only |

## Versioning

- Server version follows [Semver](https://semver.org/)
- API compatibility enforced via `PayerMax-Integration-Mcp-Min-Version` response header
- If your server version is too low, tools will return an upgrade prompt
