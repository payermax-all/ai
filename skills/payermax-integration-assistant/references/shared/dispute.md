# Dispute (Chargeback) Capability

Optional capability for handling payment disputes and chargebacks.

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Chargeback introduction | `https://docs.payermax.com/en/202606-version/acquiring/start-integration/related-capabilities-integration/chargeback/chargeback-introduction.md` |
| Chargeback integration | `https://docs.payermax.com/en/202606-version/acquiring/start-integration/related-capabilities-integration/chargeback/chargeback-integration.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/chargeBaclNotifyUrl.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_caseReplay.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_caseSearch.md`

## Implementation focus

- handle chargeback notification callback (`chargeBaclNotifyUrl`)
- implement `/caseSearch` to query dispute cases
- implement `/caseReplay` to respond to disputes (accept or challenge)
- store dispute case status and evidence

## Flow checklist

PayerMax sends chargeback notification → merchant receives and stores case → merchant queries case details (`/caseSearch`) → merchant responds (`/caseReplay` with evidence or acceptance).
