# PayerMax AI

Agent skills for integrating PayerMax payment services.

## Install

### Option 1: Agent Skills CLI (Recommended)

Uses the [Agent Skills](https://agentskills.io/) open standard. Skills will be installed to `.agents/skills/` directory.

```bash
npx skills add github.com/payermax-all/ai --skill payermax-integration-assistant
```

> **Note:** The `-a` flag syncs the skill to a specific agent's directory for discovery, but the source of truth remains `.agents/skills/`.

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

## Skills

| Skill | Description |
|---|---|
| [payermax-integration-assistant](skills/payermax-integration-assistant) | Guides AI agents through PayerMax payment integration — standard acquiring (cashier, drop-in, paybylink) and subscription billing (PMX-managed, merchant-managed, auto-debit) |

## Usage

Once installed, describe your payment needs to your AI coding agent:

```
I want to integrate PayerMax for online payments in Malaysia.
```

```
I want to integrate PayerMax subscription billing with monthly card payments.
```

The agent handles the rest — clarifies requirements, generates a solution document, and produces implementation code.

## Supported Agents

Works with any agent that supports the [Agent Skills](https://agentskills.io/) standard, including Kiro, Cursor, Claude Code, Trae, Codex, and 60+ others.

## Resources

- [PayerMax Documentation](https://docs-v2.payermax.com)
- [PayerMax Developer Center](https://developer.payermax.com)
- [Agent Skills Specification](https://agentskills.io)
