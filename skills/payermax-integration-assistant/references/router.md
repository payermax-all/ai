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
- `direct_api + sales`
- `direct_api + tokenization`
- `drop_in + sales`
- `drop_in + tokenization`          # payment_method_type must not include APM
- `pay_by_link + sales`             # tokenization not supported

### Valid combinations — Subscription

- `receipt_subscription + pmx_manage_plan + {CARD|APM|APPLEPAY|GOOGLEPAY}`
- `receipt_subscription + merchant_manage_plan + {CARD|APM|APPLEPAY|GOOGLEPAY}`
- `receipt_subscription + non_periodic_auto_debit + {CARD|APM|APPLEPAY|GOOGLEPAY}`

### Invalid combinations (reject or rewrite)

| # | Condition | Action |
|---|---|---|
| 1 | Tokenized + full cashier | Rewrite to `specified_payment_method` **and inform the user**; `payment_method_type` then becomes mandatory (can no longer default to "all") |
| 2 | Specified cashier without `payment_method_type` | Must ask for it |
| 3 | `card_org` without CARD | Reject → `card_org` only when `payment_method_type` includes CARD |
| 4 | `target_org` with only CARD | Reject → use `card_org` for card-scheme narrowing |
| 5 | Method pinning + `full_payment_method` | Rewrite to `specified_payment_method` |
| 6 | Drop-in without `payment_method_type` | Must specify (subset of CARD, GOOGLEPAY, APPLEPAY) |
| 7 | Drop-in with `cashier_variant` | Reject → `cashier_variant` only for `integration_mode: cashier` |
| 8 | Subscription without `subscription_scenario` | Must ask for it |
| 9 | Subscription without payment method | Must ask for it |
| 10 | APM + drop_in | Reject → route to cashier instead |
| 11 | `tokenization` + `drop_in` + APM | Reject → APM has no drop-in component; use `tokenization-cashier` or `tokenization-api` |
| 12 | `tokenization` + `pay_by_link` | **Ask, do not auto-rewrite** → no semantically equivalent target; the user chooses between dropping tokenization or switching to specified-payment-method cashier (see the conflict guard in `SKILL.md`) |
| 13 | `tokenization_enabled: true` without `token_type` | Default to `payermax_token`; use `external_token` only when the merchant explicitly operates their own vault |
| 14 | `direct_api` + CARD + user states not certified and unwilling | **Ask, do not auto-rewrite** → present `drop_in` / `cashier-specified_payment_method` as alternatives; user decides |

### Tokenization variant selection

| `integration_mode` | Variant file |
| --- | --- |
| `cashier` (must be `specified_payment_method`) | `references/variants/tokenization-cashier.md` |
| `direct_api` | `references/variants/tokenization-api.md` |
| `drop_in` | `references/variants/tokenization-dropin.md` |

All three additionally require `references/shared/tokenization.md`.

## Output format

```yaml
scenario_profile:
  domain: acquiring
  customer_product: acquiring_standard  # or receipt_subscription
  integration_mode: cashier             # cashier / drop_in / direct_api / pay_by_link
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

### Drop-in + tokenization (card, saved for reuse)

> "自建收银台用组件收卡，用户下次支付免输卡号。"

```yaml
scenario_profile:
  domain: acquiring
  customer_product: acquiring_standard
  integration_mode: drop_in
  transaction_mode: sales
  tokenization_enabled: true
  token_type: payermax_token
  payment_method_type:
    - CARD
workflow_branch: tokenization-dropin
variant_file: references/variants/tokenization-dropin.md
shared_files:
  - references/shared/tokenization.md
  - references/shared/drop-in-frontend.md
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
