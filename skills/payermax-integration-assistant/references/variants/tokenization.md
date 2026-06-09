# Tokenization Cashier

Use this reference when the merchant wants token-based payment under cashier mode.

## Constraint

In PayerMax cashier mode, tokenization does **not** support full-payment-method cashier. It only supports:

- specified payment method
- specified payment method plus target institution

If the profile says `full_payment_method`, stop and rewrite to `specified_payment_method`.

## Choose this branch when

- `integration_mode: cashier`
- `tokenization_enabled: true`
- `cashier_variant: specified_payment_method`

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Tokenization Introduction | `https://docs-v2.payermax.com/202506-version/receipt/tokenization/introduction.md` |
| Tokenization - Cashier Payment Integration | `https://docs-v2.payermax.com/en/202506-version/receipt/tokenization/cashier.md` |
| Tokenization - Direct API Payment Integration | `https://docs-v2.payermax.com/en/202506-version/receipt/tokenization/direct-api.md` |
| Tokenization - Drop In Payment Integration | `https://docs-v2.payermax.com/en/202506-version/receipt/tokenization/frontend-component.md` |
| Payment result (callback + query) | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/related-capabilities/refund.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_orderAndPay.md`
2. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_orderConfirm.md`
3. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_orderQuery.md`
4. `https://docs.payermax.com/api/cn/collectResultNotifyUrl.md`
5. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_confirmPayment.md`
6. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_refund.md`
7. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_refundQuery.md`
8. `https://docs.payermax.com/api/cn/RefundResultNotifyUrl.md`
9. `https://docs.payermax.com/api/cn/pageReturn.md`
10. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_applyDDC.md`

## Required routing consequences

Require:

- `token_type`
- `payment_method_type`

Optional narrowing:

- `target_org`
- `card_org`

## Router guardrail

Reject:

```yaml
cashier_variant: full_payment_method
tokenization_enabled: true
```

Rewrite recommendation:

```yaml
cashier_variant: specified_payment_method
```

## Tokenization-specific request fields

Inside `paymentDetail` on `/orderAndPay`:

- `paymentDetail.paymentTokenID` — token reuse
- `paymentDetail.tokenForFutureUse` — user authorizes future use during cashier checkout
- `paymentDetail.merchantInitiated` — MIT semantics
- `paymentDetail.mitType` — MIT subtype such as `SCHEDULED` or `UNSCHEDULED`

Never fabricate token field names if not confirmed in the current API Reference. If the merchant asks for code immediately, generate a clearly marked placeholder mapping layer and list which token fields still need verification.

## Verify-in-openapi

Before final code generation, confirm exact field names and required combinations for:

- payermax-managed token input
- external token input
- whether the chosen token flow needs only `paymentTokenID` or also `merchantInitiated` / `mitType`

## Implementation focus

- include token-specific request fields inside `paymentDetail` only — do not invent top-level token fields
- understand whether the token is PayerMax-managed or external
- callback and post-payment handling must persist token-related identifiers when applicable
- persist token-related identifiers independently from transient checkout redirect data
- callback and query handlers should tolerate asynchronous token-related updates
- keep token persistence logic separate from payment-result status transitions
