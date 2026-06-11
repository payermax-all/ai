# Specified Payment Method Cashier

Use this variant when the merchant wants to restrict what the cashier shows.

## Choose this branch when

- `integration_mode: cashier`
- `cashier_variant: specified_payment_method`

Typical triggers:

- merchant already shows payment options on its own page
- merchant wants only one method family such as `CARD` or `BANKTRANSFER`
- merchant wants to pin specific target institutions
- merchant wants to pin card schemes for card checkout

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Cashier payment creation | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/create-payment/cashier-payment.md` |
| Payment result (callback + query) | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/related-capabilities/refund.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderConfirm.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/collectResultNotifyUrl.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_confirmPayment.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
7. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
8. `https://docs.payermax.com/api/New%20Version/en/v1.0/RefundResultNotifyUrl.md`
9. `https://docs.payermax.com/api/New%20Version/en/v1.0/pageReturn.md`
10. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_applyDDC.md`

## Required routing consequences

This branch requires:

- `payment_method_type`

It may also require:

- `target_org`
- `card_org`

## Branch-specific fields

| Field | Stance | When to use |
| --- | --- | --- |
| `paymentDetail.paymentMethodType` | **Required** narrowing switch | Maps from scenario-profile `payment_method_type`. Normalized values include `CARD`, `WALLET`, `BANKTRANSFER`, `PAYLATER`, `GOOGLEPAY`, `APPLEPAY` |
| `paymentDetail.targetOrg` | Conditional | Non-card narrowing under a specific institution / wallet / brand; use together with `paymentMethodType`, not alone |
| `paymentDetail.allowedCardOrg` | Conditional | Card-scheme narrowing (e.g. Visa, Mastercard); use only when `paymentMethodType` includes `CARD` |

Mapping from scenario profile:

| Scenario field | PayerMax request direction |
| --- | --- |
| `payment_method_type` | `paymentDetail.paymentMethodType` |
| `target_org` | `paymentDetail.targetOrg` |
| `card_org` | `paymentDetail.allowedCardOrg` |
| `payment_method_selection_level` | determines which of the above appear |

## Routing consequences

If any of `paymentMethodType` / `targetOrg` / `allowedCardOrg` is present, the branch must be `specified_payment_method`, not full cashier.

## Implementation focus

- map the merchant-selected method into request parameters consistently
- keep request shaping separate from the shared cashier baseline mapper
- avoid silently falling back to full cashier when narrowing fields are incomplete

## Guardrails

- do not silently drop narrowing fields; if the merchant asked for them, keep the branch specified
- do not send `targetOrg` for card-only flows
- do not send `allowedCardOrg` for non-card flows
- if the merchant wants only one target org but did not provide `paymentMethodType`, ask for the method family before final code generation
- when `paymentMethodType` is specified, keep `country` aligned (official docs require country-method consistency)

## Suggested mapper structure

1. shared cashier baseline mapper
2. specified-method extension mapper
3. field validation that rejects inconsistent method filters before sending the request
