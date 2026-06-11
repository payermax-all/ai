# Drop-In (Front-End Component) Integration

Use this variant when the merchant wants to embed PayerMax's pre-built payment UI components (card entry, Google Pay, Apple Pay) directly into their own checkout page.

## Choose this branch when

- `integration_mode: drop_in`
- Merchant wants to control the checkout page layout but not handle raw card data
- Merchant needs embedded payment components (CARD, Google Pay, Apple Pay)

## Fetch docs before writing code

### Step 1: Fetch integration docs

| Topic | URL to fetch |
|---|---|
| Drop-In payment creation | `https://docs.payermax.com/en/doc-center/acquiring/start-integration/create-payment/frontend-component.md` |
| Payment result (callback + query) | `https://docs.payermax.com/en/doc-center/acquiring/start-integration/related-capabilities/payment-result.md` |
| Refund | `https://docs.payermax.com/en/doc-center/acquiring/start-integration/related-capabilities/refund.md` |

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay_for-drop-dont-copy-me_.md`
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

## Product advantages

- **Customizable UI**: merchants style the checkout to match their site
- **Easy scalability**: add new payment methods without additional development
- **PCI-free**: sensitive card data is collected by PayerMax components; merchant does not need PCI-DSS certification

## Supported payment methods

Drop-In currently supports:

- `CARD` — card entry form (number, expiry, CVV)
- `GOOGLEPAY` — Google Pay button
- `APPLEPAY` — Apple Pay button

Specified via `componentList` in the `/applyDropinSession` request.

## Integration flow (two-part: frontend + backend)

### Backend flow

1. **`/applyDropinSession`** — merchant server calls this to get `clientKey` + `sessionKey`
2. **`/orderAndPay`** (drop-in variant) — merchant server creates payment with `paymentToken` + `sessionKey` from the frontend
   - **Important**: Check `data.status` in the synchronous response. For card payments without 3DS, `SUCCESS` may be returned directly — do not assume all results come via callback.
3. **Payment result** — synchronous `data.status` in `/orderAndPay` response (primary for non-3DS), callback notify, and `/orderQuery` fallback
4. **Refund** — same as cashier: `/refund` + `/refundQuery`

### Frontend flow

See `references/shared/drop-in-frontend.md` for the complete frontend SDK integration guide (CDN loading, component lifecycle, test panel, payment result handling). That file is the single source of truth for all Drop-In frontend implementation — shared across standard acquiring and subscription scenarios.

## Mandatory: fetch frontend API docs before generating frontend code

See `references/shared/drop-in-frontend.md` — "Fetch frontend API docs" section for the complete URL table and rules.

## Key differences from cashier

| Aspect | Cashier | Drop-In |
| --- | --- | --- |
| `integrate` value | `Hosted_Checkout` | `Direct_Payment` |
| Payment page | PayerMax-hosted redirect | Merchant-embedded component |
| `country` | Optional | **Required** |
| Card data handling | PayerMax page | PayerMax component (iframe) |
| PCI requirement | None | None (component handles it) |
| Extra prerequisite API | None | `/applyDropinSession` |
| `paymentDetail.paymentToken` | Not used | **Required** (from JS SDK) |
| `paymentDetail.sessionKey` | Not used | **Required** (from `/applyDropinSession`) |
| `paymentDetail.buyerInfo` | Not used | **Required** (`clientIp`, `userAgent`) |
| `redirectUrl` in response | Present | Not present (payment inline) |

## Branch-specific fields on `/orderAndPay`

| Field | Stance | Notes |
| --- | --- | --- |
| `data.integrate` | `Direct_Payment` | Same value as direct API, but card data comes from the component |
| `data.country` | **Required** | Unlike cashier where it is optional |
| `paymentDetail.paymentToken` | **Required** | Obtained from JS SDK `canMakePayment` event |
| `paymentDetail.sessionKey` | **Required** | Obtained from `/applyDropinSession` response |
| `paymentDetail.buyerInfo.clientIp` | **Required** | End-user IP |
| `paymentDetail.buyerInfo.userAgent` | **Required** | End-user browser UA |

## Payment result handling (Drop-In specific)

See `references/shared/drop-in-frontend.md` — "Payment result handling" section for synchronous status handling rules (backend + frontend).

## Implementation focus

- **Two-part integration**: generate both backend API code AND frontend JS integration code
- Backend: `/applyDropinSession` → store `clientKey` + `sessionKey` → `/orderAndPay` with token
- Frontend: SDK init → mount → form events → `canMakePayment` → submit to backend
- Callback and query: identical to cashier (same notify handler, same `/orderQuery` fallback)
- Refund: identical to cashier

### Frontend test helper panel

See `references/shared/drop-in-frontend.md` — "Frontend test helper panel" section for the complete test panel template, generation checklist, and subject data flow rules.

## Guardrails

- Do not confuse with `direct_api` — drop-in uses `Direct_Payment` as the integrate value but does NOT require PCI-DSS because the component handles card data
- `paymentToken` and `sessionKey` are mandatory in the `/orderAndPay` request; without them the payment will fail
- `country` is required (unlike cashier)
- `expireTime` must be ≥ 1800 and ≤ 86400; values outside this range are clamped by the system
- 3DS authentication may be triggered for card payments; the component handles the redirect flow
- Do not ignore `data.status` in the `/orderAndPay` synchronous response — for Drop-In card payments without 3DS, the final result (`SUCCESS`) may arrive synchronously without callback

## Do not use this branch when

- The merchant wants PayerMax to host the entire payment page → use `cashier`
- The merchant wants to collect raw card data themselves → use `direct_api` (requires PCI-DSS)
- The merchant only needs a payment link → use `pay_by_link`
