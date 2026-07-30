# Tokenization — shared (mode-independent)

Token query, second payment, and unbinding are identical across cashier, direct API, and drop-in; this file is their only definition. Pair with the variant file from `references/router.md`.

## 1. Two different tokens

- `paymentToken` — from Drop-In `emit('canMakePayment')`, one session, first payment only. Never persist.
- `paymentTokenID` — from the payment callback / `/orderQuery` / `/inquirePaymentToken`, valid until expiry or unbind. Second payments and the saved-card list use this one.

## 2. Second payment: `/orderAndPay` with `paymentTokenID`

**`data.integrate` is always `Direct_Payment` for a token payment, whichever mode created the token** — including tokens created on the hosted cashier (`Hosted_Checkout`). All three official tokenization docs agree.

Required: `data.integrate`, `userId` (from the server session — the token's owner), `outTradeNo` (server-generated), `totalAmount`, `currency`, `country`, `paymentDetail.paymentTokenID`, `paymentDetail.paymentMethodType`, `paymentDetail.buyerInfo.clientIp` + `userAgent`. Recommended: `frontCallbackUrl`, allowlist-checked.

Send no `cardInfo`, no `paymentToken`, no `sessionKey`. A `redirectUrl` means 3DS — the variant file says how to handle it.

## 3. `/inquirePaymentToken`

Request `data`: `userId` (required, from session), `tokenScope` (defaults `tokenAcq`), optional `paymentTokenID`, `paymentMethodType`, `targetOrg`, `cardOrg`, `referralCode`.

Response `data.tokenList[]`: `paymentTokenID`, `userId`, `tokenScope`, `paymentTokenExpiry`, `paymentTokenStatus` (`Activated`/`Expired`/`Deleted`), `cardInfo` (masked PAN), `brand`, `ifCVV`, `paymentMethodType`, `targetOrg`, `accountDisplay`, `referralCode`.

## 4. Filter and display

Filter server-side before returning tokens to the browser. Keep a token only when `paymentTokenStatus == "Activated"`, `paymentTokenExpiry` is in the future, `paymentTokenID` is non-empty, `paymentMethodType` is supported by this checkout, and — for CARD — `cardInfo` is non-empty. `ifCVV == "Y"` means the user re-enters CVV with that token.

Empty filtered list (no token yet, or the last card was just removed) → fall back to the first-payment flow of the current mode.

Display `cardInfo` verbatim, never reconstruct a PAN; brand icon from `brand`, generic fallback for unknown values. Never render an `Expired` or `Deleted` token as a payable option.

## 5. `/removePaymentToken` — unbinding is a mandatory deliverable

Token payment without an unbind UI is an incomplete integration.

1. Each saved card shows `brand` + `cardInfo`, with an explicit Remove action.
2. Remove asks for confirmation.
3. The frontend submits only the `paymentTokenID`.
4. The server takes `userId` from the session, never the request body, and verifies the token belongs to that user.
5. Call `/removePaymentToken` with `data.userId`, `data.paymentTokenID`, optional `data.removeReason`.
6. Drop the card from the UI only on `code == "APPLY_SUCCESS"` plus `data.paymentTokenStatus == "Deleted"`; otherwise keep it and allow a retry.

A removed `paymentTokenID` must never be used again.

## 6. Server-side security checklist

- [ ] `userId` from the authenticated session on every token endpoint
- [ ] Ownership re-verified before every token payment and unbind
- [ ] `/inquirePaymentToken` scoped to the current user
- [ ] `frontCallbackUrl` validated against a domain allowlist
- [ ] `paymentTokenID`, `cardInfo`, email, signatures masked in logs
- [ ] Payment state in a shared DB/cache, not process memory

## 7. Merchant endpoint contract

The frontend never calls PayerMax directly; the signing key stays server-side. Minimum set (adapt paths to project conventions):

- `POST /api/dropin/session` — `clientKey`/`sessionKey` (drop-in only)
- `POST /api/payments` — first payment or token second payment
- `GET /api/users/me/payment-tokens` — saved methods of the logged-in user
- `POST /api/notifycallback` — PayerMax async notification
- `GET /api/payments/{outTradeNo}/status` — frontend polls merchant order state

## 8. When a token is created

All three required: the consent flag on the request that opens the payment (mode-specific — see the variant file); the user accepted the agreement; `paymentDetail.tokenForFutureUse: true` on `/orderAndPay`. Passing `true` without the first two makes the order **fail validation** — compute the value, never hardcode it.

Mode-specific first-payment flows, component SDK usage, cashier redirect, and PCI discussion are not here — see the variant file.
