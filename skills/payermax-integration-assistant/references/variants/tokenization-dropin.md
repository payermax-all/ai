# Tokenization — Drop-In Component

The merchant hosts the checkout page, PayerMax components collect the payment details, and the token agreement checkbox is rendered by the component.

## Choose this branch when

- `integration_mode: drop_in`
- `tokenization_enabled: true`

## Constraint: no APM

`payment_method_type` must be a subset of `CARD`, `APPLEPAY`, `GOOGLEPAY`. APM has no drop-in component, so an APM requirement forces `tokenization-cashier.md` or `tokenization-api.md`.

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Tokenization introduction | `https://docs.payermax.com/en/202506-version/receipt/tokenization/introduction.md` |
| Tokenization — drop-in payment | `https://docs.payermax.com/en/202506-version/receipt/tokenization/frontend-component.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/202506-version/acquiring/start-integration/related-capabilities/refund.md` |

Plus one component configuration doc per selected payment method:

| Payment method | URL to fetch |
|---|---|
| CARD | `https://docs.payermax.com/en/202506-version/receipt/front-end-component/configuration-card.md` |
| GOOGLEPAY | `https://docs.payermax.com/en/202506-version/receipt/front-end-component/configuration-googlepay.md` |
| APPLEPAY | `https://docs.payermax.com/en/202506-version/receipt/front-end-component/configuration-applepay.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay_for-drop-dont-copy-me_.md` — **note the drop-in-specific path; it differs from the cashier and direct-API `orderAndPay` docs**
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_applyDropinSession.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderConfirm.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/collectResultNotifyUrl.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_confirmPayment.md`
7. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
8. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
9. `https://docs.payermax.com/api/New%20Version/en/v1.0/RefundResultNotifyUrl.md`
10. `https://docs.payermax.com/api/New%20Version/en/v1.0/pageReturn.md`
11. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_applyDDC.md`
12. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_inquirePaymentToken.md`
13. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_removePaymentToken.md`

## First payment flow

1. **Merchant server** calls `/applyDropinSession` with `tokenForFutureUse: true`. That flag is what makes the component render the token agreement checkbox — without it the user never sees the option. Returns `clientKey`, `sessionKey`, `notSupportedComponent`.
2. **Frontend** loads the SDK, then `PMdropin.create(...)` + `mount(...)` per `references/shared/drop-in-frontend.md`.
3. **User pays** → `emit('canMakePayment', ...)` resolves with `paymentToken` **and `agreementAccepted`**.
4. **Frontend** posts `paymentToken`, `sessionKey`, and `agreementAccepted` to the merchant server, which calls `/orderAndPay` with `integrate: Direct_Payment`, `paymentDetail.paymentToken`, `paymentDetail.sessionKey`, `paymentDetail.buyerInfo`, and `paymentDetail.tokenForFutureUse`.

## The `agreementAccepted` rule (drop-in only)

A token is created only when all three hold:

1. `/applyDropinSession` was called with `tokenForFutureUse: true`;
2. the user ticked the agreement, so the component returned `agreementAccepted: true`;
3. `/orderAndPay` also carries `paymentDetail.tokenForFutureUse: true`.

If 1 or 2 is missing and the order still sends `true`, **the order fails validation**. So the server must derive `tokenForFutureUse` from the `agreementAccepted` value relayed by the frontend:

```js
tokenForFutureUse: sessionRequestedToken && agreementAccepted === true
```

Never hardcode `true`. When the user declines, send `false` and complete the payment normally — no token is produced.

## 3DS

Card payments here may return `redirectUrl`, and the SDK does not handle it for you. Use `component.create3DSPopup({ url })` — not `window.open`, not a full-page redirect. Details, including `3DS_PROCESSED` / `USER_CANCEL` handling, are in `references/shared/drop-in-frontend.md` — "3DS authentication".

## Second payment, token list, unbinding

See `references/shared/tokenization.md`. The second payment does **not** need a Drop-In session: it goes straight to `/orderAndPay` with `paymentTokenID`, so no `applyDropinSession`, no `paymentToken`, no `sessionKey`.

Render the saved-card list from the merchant's own token endpoint and only mount the Card component when the list is empty or the user chooses "add a new card".

## Do not use this branch when

- APM is required → `tokenization-cashier.md` or `tokenization-api.md`
- The merchant wants PayerMax to host the whole page → `tokenization-cashier.md`
- The merchant collects raw card data itself → `tokenization-api.md` (requires PCI-DSS)
