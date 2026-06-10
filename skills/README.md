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

# Qwen-code
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a qwen-code

# Windsurf
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a windsurf
```

### Option 2: Manual Installation

Clone this repository and copy the skill directory into your agent's skills folder:

```bash
git clone https://github.com/payermax-all/ai.git
```

Then copy `skills/payermax-integration-assistant` to your agent's skills directory, for example:

| Agent | Target Path |
|---|---|
| Kiro | `.kiro/skills/payermax-integration-assistant` |
| Claude Code | `.claude/skills/payermax-integration-assistant` |
| Codex | `.codex/skills/payermax-integration-assistant` |
| Qoder | `.qoder/skills/payermax-integration-assistant` |
| Trae | `.trae/skills/payermax-integration-assistant` |

## Usage

Describe your payment needs to the AI agent:

> I want to integrate PayerMax for online payments in Malaysia.

> I want to integrate PayerMax subscription billing for my SaaS product, with monthly card payments.

The AI will ask follow-up questions to clarify:
- Target country/market
- Checkout page approach (cashier, drop-in)
- Payment methods needed
- For subscription: scenario type, payment method

After confirmation, the AI generates the complete integration code.

## Repository Structure

```
skills/
└── payermax-integration-assistant/    ← the skill
    ├── SKILL.md                       ← entry point
    ├── references/
    │   ├── router.md
    │   ├── shared/
    │   ├── variants/
    │   └── output/
    └── shared-models/
```

## Resources

- PayerMax Documentation: https://docs-v2.payermax.com
- Developer Center: https://developer.payermax.com
- Agent Skills Specification: https://agentskills.io
