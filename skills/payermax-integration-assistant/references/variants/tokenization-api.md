# Tokenization — Direct API

The merchant's own checkout page collects the card, and the merchant server calls `/orderAndPay` with the raw card data plus `tokenForFutureUse`.

## PCI-DSS is required

**This is the only tokenization branch where the merchant touches raw card data** (PAN, expiry, CVV), so the merchant must hold PCI-DSS certification. If the merchant does not have it, stop and recommend `tokenization-dropin.md` (component iframe) or `tokenization-cashier.md` (hosted page) instead — both keep card data out of the merchant's systems.

## Choose this branch when

- `integration_mode: direct_api`
- `tokenization_enabled: true`

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Tokenization introduction | `https://docs.payermax.com/en/202506-version/receipt/tokenization/introduction.md` |
| Tokenization — direct API payment | `https://docs.payermax.com/en/202506-version/receipt/tokenization/direct-api.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/refund.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay_delSuffixStart1.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/collectResultNotifyUrl.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/RefundResultNotifyUrl.md`
7. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_inquirePaymentToken.md`
8. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_removePaymentToken.md`

## First payment

`/orderAndPay` with:

- `data.integrate: Direct_Payment`
- `data.userId` — from the server session; the token will be bound to this user
- `data.terminalType` (and `osType` where the fetched doc requires it)
- `data.paymentDetail.paymentMethodType`
- `data.paymentDetail.cardInfo` — card number, holder name, expiry month/year, CVV
- `data.paymentDetail.buyerInfo` — including `clientIp` and `userAgent`
- `data.paymentDetail.tokenForFutureUse: true`

## Consent is the merchant's responsibility

There is no PayerMax-rendered agreement in this branch. The merchant builds its own "save this card" consent UI, stores the record of consent, and owns the wording and its compliance. Send `tokenForFutureUse: true` only when that consent was actually given — derive it from the submitted form, never hardcode it.

## 3DS and other authentication

When the response carries `redirectUrl` with `data.status: PENDING`, send the user there via a full-page redirect or the merchant's own WebView, then resume on `frontCallbackUrl` and confirm the real state from the callback or `/orderQuery`.

**`create3DSPopup` is not available here** — it is a Drop-In component SDK method and does not exist without the component. Do not generate code that calls it in this branch.

## Payment methods

CARD, ApplePay, GooglePay, and APM are all supported. Wallets go through their client-side SDK first: obtain the wallet token in the browser/app, post it to the merchant server, and pass it on in `paymentDetail`. APM token support varies by wallet — confirm the specific wallet in the docs fetched in Step 1 rather than assuming.

## Second payment, token list, unbinding

See `references/shared/tokenization.md`.

## Do not use this branch when

- The merchant has no PCI-DSS certification → `tokenization-dropin.md` or `tokenization-cashier.md`
- The merchant wants embedded PayerMax components → `tokenization-dropin.md`
- The merchant wants PayerMax to host the page → `tokenization-cashier.md`
