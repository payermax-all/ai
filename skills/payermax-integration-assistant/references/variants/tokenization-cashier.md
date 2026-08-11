# Tokenization — Hosted Cashier

First payment happens on the PayerMax-hosted cashier page; the user accepts the token agreement there.

## Choose this branch when

- `integration_mode: cashier`
- `cashier_variant: specified_payment_method`
- `tokenization_enabled: true`

## Constraint: full cashier is not supported

Cashier tokenization supports only `specified_payment_method` (optionally narrowed further by target institution). If the profile says `full_payment_method`, rewrite it to `specified_payment_method`, tell the user, and collect `payment_method_type` — it can no longer default to "all". See the conflict guard in `SKILL.md`.

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Tokenization introduction | `https://docs.payermax.com/en/202506-version/receipt/tokenization/introduction.md` |
| Tokenization — cashier payment | `https://docs.payermax.com/en/202506-version/receipt/tokenization/cashier.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/refund.md` |

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
11. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_inquirePaymentToken.md`
12. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_removePaymentToken.md`

## First payment

`/orderAndPay` with:

- `data.integrate: Hosted_Checkout`
- `data.userId` — from the server session; the token will be bound to this user
- `data.paymentDetail.paymentMethodType` — required (this branch is always specified-method)
- `data.paymentDetail.tokenForFutureUse: true`
- optional narrowing: `paymentDetail.allowedCardOrg` (CARD only), `paymentDetail.targetOrg` (non-card)

Response returns `redirectUrl` → redirect the user to the PayerMax cashier → the user ticks the token agreement there → PayerMax returns the browser to `frontCallbackUrl`.

## Consent is invisible to the merchant

This is the key difference from the other two modes: **there is no `agreementAccepted` signal**. The merchant cannot know at order-creation time whether the user will tick the token agreement, so it sends `tokenForFutureUse: true` as an offer, not a promise.

Whether a token was actually created is determined **afterwards**, by the presence of `paymentTokenID` in the async result notification or `/orderQuery` response. Never assume a token exists just because the order was created with `tokenForFutureUse: true`.

## 3DS

The challenge is presented inside the PayerMax cashier page, so the merchant builds no 3DS UI. The `applyDDC` / `orderConfirm` / `confirmPayment` docs in Step 2 are the same set the non-token specified-method cashier fetches — follow them if the cashier doc fetched in Step 1 requires device-data collection or an explicit confirm step for the selected method.

## Payment methods

CARD and APM are both accepted here. APM token support varies by wallet — confirm the specific wallet in the docs fetched in Step 1 rather than assuming every APM can be tokenized.

## Second payment, token list, unbinding

See `references/shared/tokenization.md`. Note that the second payment switches to `integrate: Direct_Payment` even though the first payment used `Hosted_Checkout`.

## Do not use this branch when

- `cashier_variant: full_payment_method` → not supported, rewrite to specified (see above)
- `integration_mode: drop_in` → `tokenization-dropin.md`
- `integration_mode: direct_api` → `tokenization-api.md`
