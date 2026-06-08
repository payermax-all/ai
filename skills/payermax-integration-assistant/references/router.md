# Scenario Router

Normalize the merchant's business request into a structured `scenario_profile` before implementation.

Canonical profile schema: `../../shared-models/scenario-profile.yaml`

## Decision flow

The structured clarification flow (product → scenario → integration mode → payment methods) is defined in `SKILL.md` Phase 1. This file focuses on **validation, normalization, and output format**.

After Phase 1 completes, use the rules below to validate the combination and produce the normalized `scenario_profile`.

## Validation rules

### Valid combinations — Standard Acquiring

- `cashier + full_payment_method + sales + no tokenization`
- `cashier + specified_payment_method + sales + no tokenization`
- `cashier + specified_payment_method + tokenization`
- `drop_in + sales`

### Valid combinations — Subscription

- `receipt_subscription + pmx_manage_plan + {CARD|APM|APPLEPAY|GOOGLEPAY}`
- `receipt_subscription + merchant_manage_plan + {CARD|APM|APPLEPAY|GOOGLEPAY}`
- `receipt_subscription + non_periodic_auto_debit + {CARD|APM|APPLEPAY|GOOGLEPAY}`

### Invalid combinations (reject or rewrite)

| # | Condition | Action |
|---|---|---|
| 1 | Tokenized + full cashier | Reject → rewrite to `specified_payment_method` |
| 2 | Specified cashier without `payment_method_type` | Must ask for it |
| 3 | `card_org` without CARD | Reject → `card_org` only when `payment_method_type` includes CARD |
| 4 | `target_org` with only CARD | Reject → use `card_org` for card-scheme narrowing |
| 5 | Method pinning + `full_payment_method` | Rewrite to `specified_payment_method` |
| 6 | Drop-in without `payment_method_type` | Must specify (subset of CARD, GOOGLEPAY, APPLEPAY) |
| 7 | Drop-in with `cashier_variant` | Reject → `cashier_variant` only for `integration_mode: cashier` |
| 8 | Subscription without `subscription_scenario` | Must ask for it |
| 9 | Subscription without payment method | Must ask for it |
| 10 | APM + drop_in | Reject → route to cashier instead |

## Output format

```yaml
scenario_profile:
  domain: acquiring
  customer_product: acquiring_standard  # or receipt_subscription
  integration_mode: cashier             # cashier / drop_in / direct_api
  cashier_variant: specified_payment_method  # full_payment_method / specified_payment_method (cashier only)
  transaction_mode: sales               # sales
  tokenization_enabled: false
  merchant_type: direct_merchant
  payment_method_type:
    - CARD
  # Subscription-specific fields (only when customer_product = receipt_subscription):
  subscription_scenario: pmx_manage_plan  # pmx_manage_plan / merchant_manage_plan / non_periodic_auto_debit
  subscription_payment_method: CARD       # CARD / APM / APPLEPAY / GOOGLEPAY
workflow_branch: specified-payment-method
variant_file: references/variants/specified-payment-method.md
```

Include `open_questions` only when the answer would materially change the implementation.

## Examples

### Full cashier

> "Let PayerMax show all payment methods."

```yaml
scenario_profile:
  integration_mode: cashier
  cashier_variant: full_payment_method
  transaction_mode: sales
  tokenization_enabled: false
workflow_branch: full-payment-method
variant_file: references/variants/full-payment-method.md
```

### Specified cashier (card only)

> "Our checkout lets users pick CARD first, then redirect to PayerMax."

```yaml
scenario_profile:
  integration_mode: cashier
  cashier_variant: specified_payment_method
  transaction_mode: sales
  tokenization_enabled: false
  payment_method_type:
    - CARD
workflow_branch: specified-payment-method
variant_file: references/variants/specified-payment-method.md
```

### Drop-in (card + Google Pay)

> "Embed card form and Google Pay on our checkout page."

```yaml
scenario_profile:
  integration_mode: drop_in
  transaction_mode: sales
  tokenization_enabled: false
  payment_method_type:
    - CARD
    - GOOGLEPAY
workflow_branch: drop-in
variant_file: references/variants/drop-in.md
```

### Subscription — PayerMax manage (card)

> "Monthly subscription billing, PayerMax handles recurring charges."

```yaml
scenario_profile:
  domain: acquiring
  customer_product: receipt_subscription
  subscription_scenario: pmx_manage_plan
  subscription_payment_method: CARD
workflow_branch: subscription-pmx-manage
variant_file: references/variants/subscription/pmx-manage.md
```

### Subscription — Merchant manage (APM)

> "We manage billing ourselves, charge users monthly via KakaoPay."

```yaml
scenario_profile:
  domain: acquiring
  customer_product: receipt_subscription
  subscription_scenario: merchant_manage_plan
  subscription_payment_method: APM
workflow_branch: subscription-merchant-manage
variant_file: references/variants/subscription/merchant-manage.md
```

### Subscription — Non-periodic auto debit (card)

> "Charge users on-demand based on usage, using their saved card."

```yaml
scenario_profile:
  domain: acquiring
  customer_product: receipt_subscription
  subscription_scenario: non_periodic_auto_debit
  subscription_payment_method: CARD
workflow_branch: subscription-auto-debit
variant_file: references/variants/subscription/auto-debit.md
```
