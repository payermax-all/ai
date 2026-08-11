# PayByLink

Use this variant when the merchant wants to generate payment links for customers to access via URL or QR code.

## Choose this branch when

- `integration_mode: pay_by_link`
- No payment method type restrictions (all supported)

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| PayByLink integration flow | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/create-payment/paybylink.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/refund.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_createPaybylink.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_queryPaybylink.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_expirePaybylink.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/payLinkResultNotifyUrl.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
7. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
8. `https://docs.payermax.com/api/New%20Version/en/v1.0/RefundResultNotifyUrl.md`

## Merchant behavior

- merchant creates a payment link via `/createPaybylink`
- merchant provides the `linkUrl` or `qrCodeUrl` to the customer (offline, social media, email, SMS, etc.)
- customer accesses the link, lands on the hosted PayerMax cashier, and completes payment
- no frontend integration needed; no redirect flow on merchant side

## Implementation focus

- build a valid `/createPaybylink` request with required goods and merchant info
- store `linkId`, `linkUrl`, `qrCodeUrl` from response
- handle `payLinkResultNotifyUrl` callback for payment result
- implement `/orderQuery` as fallback
- implement link lifecycle management (`/queryPaybylink`, `/expirePaybylink`)

## Flow checklist

`/createPaybylink` → provide link to customer → customer pays → `payLinkResultNotifyUrl` callback → `/orderQuery` if needed.

## Do not use this branch when

- the merchant needs real-time redirect checkout flow → `full_payment_method` or `specified_payment_method`
- the merchant wants to embed payment UI in their own page → `drop_in`
