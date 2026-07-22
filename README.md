# PayerMax AI

This repo is the one-stop shop for building AI-powered products and businesses on top of PayerMax. It provides AI agent skills and MCP servers that automate payment integration from within your IDE.

## Quick Start

For the fastest integration experience, install **both** the Skill and MCP Server:

1. **Install the Skill** — teaches your AI agent how to design and implement PayerMax integrations
2. **Install the MCP Server** — gives your AI agent access to PayerMax Developer Center APIs (auth, keypairs, config, acceptance)

Together they enable a fully automated workflow: describe your payment needs → AI generates code → credentials auto-configured → acceptance tests pass — all without leaving the IDE.

## Skills

| Skill | Description | Install |
|---|---|---|
| [payermax-integration-assistant](skills/payermax-integration-assistant) | Guides AI agents through PayerMax payment integration — standard acquiring, subscription, dispute handling | [Install guide](skills/README.md) |

## MCP Servers

| Server | Description | Install |
|---|---|---|
| [payermax-developer-mcp-server](mcp/payermax-developer-mcp-server) | Connects AI agents to PayerMax Developer Center — OAuth2 auth, keypair management, sandbox config, acceptance testing | [Install guide](mcp/payermax-developer-mcp-server/README.md) |

## How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent (Cursor / Kiro / Claude Code / Codex / ...)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Integration Skill          MCP Server                      │
│  ┌───────────────┐         ┌────────────────────────┐      │
│  │ Understand    │         │ authenticate           │      │
│  │ requirements  │         │ sandbox_generate_keypair│      │
│  │ Generate      │────────▶│ get_sandbox_config     │      │
│  │ solution doc  │ calls   │ configure_notify_url   │      │
│  │ Produce code  │ tools   │ update_payment_methods │      │
│  │ Run tests     │         │ trigger_acceptance     │      │
│  └───────────────┘         └────────────────────────┘      │
│                                    │                        │
└────────────────────────────────────│────────────────────────┘
                                     │ HTTPS
                              ┌──────▼──────────┐
                              │ PayerMax        │
                              │ Developer Center│
                              └─────────────────┘
```

## Resources

- [PayerMax Documentation](https://docs-v2.payermax.com)
- [PayerMax Developer Center](https://developer.payermax.com)
- [Agent Skills Specification](https://agentskills.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
