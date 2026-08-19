~# Direct API

Use this variant when the merchant builds their own checkout page and calls PayerMax APIs directly.

## Prerequisite: PCI-DSS (Card only)

When `payment_method_type` includes CARD, the merchant must hold PCI-DSS certification (raw card data flows through merchant systems). APM / Apple Pay / Google Pay do not trigger this requirement. Sandbox development is not blocked — certification is required before production go-live.

Ref: https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/card/pcidss.html

## Choose this branch when

- `integration_mode: direct_api`
- Merchant needs full control over the payment UX
- Merchant handles redirect/3DS/wallet authentication flows

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Direct API integration overview | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/create-payment/direct-api.md` |
| Card direct API | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/card/direct-api.md` |
| GooglePay direct API | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/googlepay/direct-api.md` |
| ApplePay direct API | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/applepay/direct-api.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/refund.md` |

**Conditional fetch based on payment method type:**
- If Card selected → must fetch Card direct API doc
- If GooglePay selected → must fetch GooglePay direct API doc
- If ApplePay selected → must fetch ApplePay direct API doc
- If APM selected → overview doc is sufficient (same URL as integration overview)

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay_delSuffixStart1.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/collectResultNotifyUrl.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/RefundResultNotifyUrl.md`

## Merchant behavior

- merchant builds their own checkout page (card form, wallet buttons, APM selection)
- merchant collects payment info and sends to their server
- merchant server calls `/orderAndPay` with full payment details (paymentMethodType, card data / wallet token / APM params)
- merchant handles redirectUrl for user authentication (3DS, wallet login, bank redirect)
- merchant processes callback and query for payment result

## Implementation focus

- build `/orderAndPay` request with payment method-specific `paymentDetail` fields
- handle `redirectUrl` in response — redirect user for authentication
- process `collectResultNotifyUrl` callback for payment result
- implement `/orderQuery` as fallback
- for Card: handle 3DS redirect and return flow
- for GooglePay/ApplePay: integrate client-side SDK to obtain payment token, pass to server
- for APM: handle wallet/bank redirect and return

## Flow checklist

`/orderAndPay` (with full paymentDetail) → redirectUrl (if needed) → user authentication → `collectResultNotifyUrl` callback → `/orderQuery` if needed.

## Tokenization

If `tokenization_enabled: true`, route to `references/variants/tokenization-api.md` instead. Note that direct-API tokenization still requires PCI-DSS for the first payment, since the merchant collects raw card data.

## Do not use this branch when

- the merchant wants PayerMax to host the checkout page → `full_payment_method` or `specified_payment_method`
- the merchant wants embedded UI components without PCI-DSS → `drop_in`
- the merchant wants payment links for offline/sharing → `pay_by_link`
