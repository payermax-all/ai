# PayerMax Integration Assistant

AI Skill for integrating PayerMax payment services. Supports standard acquiring (cashier, drop-in, direct API, paybylink) and subscription billing (PayerMax-managed plans, merchant-managed plans, non-periodic auto debit).

## Supported Products

| Product | Scenarios |
| --- | --- |
| **Standard Acquiring** | Cashier (full/specified payment method), Drop-In, Direct API, PayByLink, Tokenization |
| **Subscription** | PayerMax Manage Plans, Merchant Manage Plans, Non-Periodic Auto Debit |

## Install

### Option 1: Agent Skills CLI

Uses the [Agent Skills](https://agentskills.io/) open standard. If your agent is not listed in the [Agent Skills Supported Agent List](https://github.com/vercel-labs/skills#supported-agents), please use *Option 2: Manual Installation* instead.

Below are installation commands for common agents. For more agents, see the [Agent Skills Supported Agent List](https://github.com/vercel-labs/skills#supported-agents).

```bash
# Claude Code
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a claude-code

# Codex
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a codex

# Kiro
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a kiro-cli

# Cursor
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a cursor

# Qoder
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a qoder

# Trae
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a trae
```

### Option 2: Manual Installation

Clone this repository and copy the skill directory into your agent's skills folder:

```bash
git clone https://github.com/payermax-all/ai.git
```

Then copy `skills/payermax-integration-assistant` to your agent's skills directory, for example:

```bash
# Claude Code
.claude/skills/payermax-integration-assistant

# Codex
.codex/skills/payermax-integration-assistant

# Kiro
.kiro/skills/payermax-integration-assistant

# Cursor
.cursor/skills/payermax-integration-assistant

# Qoder
.qoder/skills/payermax-integration-assistant

# Trae
.trae/skills/payermax-integration-assistant
```

## Recommended: Install PayerMax MCP Server

The Integration Skill works best when paired with the **PayerMax Developer MCP Server**. With both installed:

- ✅ Sandbox credentials auto-filled (no manual copy-paste from Developer Center)
- ✅ RSA keypair generated and uploaded automatically
- ✅ Payment methods enabled programmatically
- ✅ Acceptance tests triggered and verified from IDE

Without the MCP Server, the skill will generate code with placeholder credentials and guide you to configure them manually.

**Install the MCP Server** — add to your IDE's MCP configuration:

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

→ [MCP Server documentation](https://github.com/payermax-all/ai/tree/main/mcp/payermax-developer-mcp-server)

## Usage

Describe your payment needs to the AI agent:

> I want to integrate PayerMax for online payments in Malaysia.

> I want to integrate PayerMax subscription billing for my SaaS product, with monthly card payments.

After confirmation, the agent handles the rest — clarifies requirements, generates a solution document, and produces implementation code.

## Supported Agents

Works with any agent that supports the [Agent Skills](https://agentskills.io/) standard, including Kiro, Cursor, Claude Code, Trae, Codex, and 60+ others.

## Resources

- [PayerMax Documentation](https://docs-v2.payermax.com)
- [PayerMax Developer Center](https://developer.payermax.com)
- [Agent Skills Specification](https://agentskills.io)
