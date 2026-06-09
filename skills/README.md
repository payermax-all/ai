# PayerMax Integration Assistant

AI Skill for integrating PayerMax payment services. Supports standard acquiring (cashier, drop-in, paybylink) and subscription billing (PayerMax-managed plans, merchant-managed plans, non-periodic auto debit).

## Supported Products

| Product | Scenarios |
| --- | --- |
| **Standard Acquiring** | Cashier (full/specified payment method), Drop-In, PayByLink, Tokenization |
| **Subscription** | PayerMax Manage Plans, Merchant Manage Plans, Non-Periodic Auto Debit |

## Install

```bash
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant
```

Or install to a specific agent:

```bash
# Kiro
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a kiro-cli

# Cursor
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a cursor

# Trae
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant -a trae
```

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
