# PayerMax Integration Solution

## 1. Business Understanding

- merchant summary:
- target market:
- payment use case:
- terminal assumptions:
- useful business links:

## 2. Recommended Integration Scenario

- product family:
- customer product:
- integration mode:
- workflow branch:
- merchant type:

### Normalized Scenario Profile

```yaml
scenario_profile:
  domain: acquiring
  customer_product:
  integration_mode:
  cashier_variant:
  transaction_mode:
  tokenization_enabled:
  token_type:
  merchant_type:
  payment_method_type:
  target_org:
  card_org:
  country:
  currency:
  terminal:
  # Subscription-specific (only when customer_product = receipt_subscription):
  subscription_scenario:          # pmx_manage_plan / merchant_manage_plan / non_periodic_auto_debit
  subscription_payment_method:    # CARD / APM / APPLEPAY / GOOGLEPAY
```

## 3. Why This Scenario

- scenario reasoning:
- key constraints:
- rejected alternatives if any:

## 4. Required APIs

### Core APIs

- `/orderAndPay`
- `/orderQuery`
- `/refund`
- `/refundQuery`

<!-- Include for subscription (pmx_manage_plan): -->
- `/subscriptionCreate`
- `/subscriptionQuery`
- `/subscriptionCancel`

<!-- Include for subscription (merchant_manage / auto_debit): -->
- `/removePaymentToken`

<!-- Include when tokenization_enabled = true (any integration mode): -->
- `/inquirePaymentToken`
- `/removePaymentToken`

<!-- Include for drop-in mode: -->
- `/applyDropinSession`

### Callback APIs

- `collectResultNotifyUrl` — payment result notify

<!-- Include for subscription (pmx_manage_plan): -->
- `subscriptionPaymentResultNotifyUrl` — per-period deduction result
- `subscriptionResultNotifyUrl` — plan status change

### Optional Related APIs

- `refundResultNotifyUrl` — refund result notify

## 5. Required Capabilities

- request signing
- callback signature verification
- callback acknowledgement
- idempotency
- order status mapping
- query fallback (dual-channel: callback + query)
- refund result handling (dual-channel: callback + query)
- environment configuration
- testing and go-live checklist

<!-- Include if dispute capability requested: -->
- dispute/chargeback notification handling
- dispute case query and response

<!-- Include for subscription (merchant_manage / auto_debit): -->
- token storage and management
- token unbind flow
- merchant-initiated deduction logic

<!-- Include when tokenization_enabled = true: -->
- token storage and lifecycle management
- token ownership verification (server-side)
- saved payment method list UI
- token unbind flow with confirmation
- empty-token-list fallback to first-payment flow

<!-- Include for subscription (pmx_manage_plan): -->
- subscription plan creation and configuration
- subscription status tracking (INACTIVE → ACTIVE → TERMINATE/CANCEL/FINISH)
- per-period deduction status tracking

## 6. References To Read Next

- skill references:
- product docs:
- API docs:

## 7. Open Questions

- only include questions that materially change implementation

## 8. Recommended Next Step

- revise this solution document
- confirm this solution, then continue to generate backend integration code
- review an existing integration
