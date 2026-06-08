# Full Payment Method Cashier

Use this variant when the merchant wants a simple checkout entry and lets PayerMax display the available payment methods.

## Choose this branch when

- `integration_mode: cashier`
- `cashier_variant: full_payment_method`
- `tokenization_enabled: false`

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Cashier payment creation | `https://docs-v2.payermax.com/doc-center/acquiring/start-integration/create-payment/cashier-payment.md` |
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

## Merchant behavior

- merchant creates the order with `/orderAndPay`
- merchant does **not** narrow payment methods in the request
- user lands on the hosted PayerMax cashier and chooses from supported methods

## Implementation focus

- build a clean create-payment request (no `paymentDetail` narrowing)
- preserve order idempotency using a stable merchant `outTradeNo`
- handle redirect and front callback safely
- process notify callback and `/orderQuery` fallback

## Fields that must NOT appear in this branch

Do not add these in the request — if any appear, rewrite the branch to `specified_payment_method`:

- `paymentDetail.paymentMethodType`
- `paymentDetail.targetOrg`
- `paymentDetail.allowedCardOrg`
- tokenization-only fields (`paymentDetail.paymentTokenID`, `tokenForFutureUse`, `merchantInitiated`, `mitType`)

## Flow checklist

`orderAndPay` → redirect → front callback (non-authoritative) → notify → `/orderQuery` if needed.

## Do not use this branch when

- the merchant wants to show only a subset of payment methods → `specified_payment_method`
- the merchant wants to pin target institutions or card schemes → `specified_payment_method`
- tokenization is required → `tokenization.md` (which mandates `specified_payment_method`)
