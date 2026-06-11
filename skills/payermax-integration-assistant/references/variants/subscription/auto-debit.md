# Subscription — Non-Periodic Auto Debit

Use this variant when the merchant needs to charge users on an irregular/on-demand basis after an initial payment method binding. Unlike periodic subscriptions, there is no fixed billing cycle — the merchant decides when and how much to charge.

## Choose this branch when

- `customer_product: receipt_subscription`
- `subscription_scenario: non_periodic_auto_debit`

## Product overview

Non-periodic auto debit enables merchants to charge users without a fixed schedule:

1. User binds a payment method (first payment via cashier/API/drop-in)
2. PayerMax returns a `paymentTokenID` for the bound payment method
3. Merchant initiates deductions whenever needed (no fixed period)
4. Each deduction uses the token — no user interaction required
5. When user cancels, merchant unbinds the payment method via API

Typical use cases: usage-based billing, balance top-ups, pay-as-you-go services, variable-amount charges.

## Integration flow

```
Bind Payment Method → Store paymentTokenID → [Merchant initiates deductions on demand] → Receive results → [User cancels] → Unbind token
```

1. **Bind payment method** — `/orderAndPay` with token binding parameters
2. **Receive bind result** — `collectResultNotifyUrl` callback + `/orderQuery` fallback; extract `paymentTokenID` from either
3. **Subsequent deductions** — `/orderAndPay` with stored token (variable amounts)
4. **Receive deduction result** — `collectResultNotifyUrl` callback
5. **Query** — `/orderQuery` as fallback
6. **Unbind** — `/removePaymentToken` when user cancels

## Key APIs

| API | Purpose |
|---|---|
| `/orderAndPay` | Initial payment (bind) + subsequent deductions |
| `/applyDropinSession` | Get clientKey/sessionKey for drop-in component (drop-in mode only) |
| `/orderQuery` | Query payment status |
| `/removePaymentToken` | Unbind payment method (remove stored token) |
| `collectResultNotifyUrl` | Payment result callback (both initial and subsequent) |
| `/refund` | Refund a deduction |
| `/refundQuery` | Query refund status |

## Fetch docs before writing code

### Step 1: Fetch payment-method-specific integration doc

Based on the user's selected payment method type, fetch the corresponding integration doc. If multiple payment methods selected, fetch ALL.

| Payment Method | URL to fetch |
|---|---|
| CARD | `https://docs.payermax.com/en/202506-version/receipt/subscription/auto-debit-integration.md` |
| APM | `https://docs.payermax.com/en/202506-version/receipt/subscription/apm/auto-debit-integration.md` |
| APPLEPAY | `https://docs.payermax.com/en/202506-version/receipt/subscription/applepay/auto-debit-integration.md` |
| GOOGLEPAY | `https://docs.payermax.com/en/202506-version/receipt/subscription/googlepay/auto-debit-integration.md` |

**Note:** When `integration_mode == drop_in` and GOOGLEPAY or APPLEPAY is selected, the frontend `canMakePayment` call requires `mitManagementUrl` parameter (unlike merchant-manage, `subscriptionPlan` is not required for non-periodic auto debit). The fetched integration doc (Step 1 URL above) contains the authoritative frontend example code — use it as-is for `canMakePayment` parameters. See `references/shared/drop-in-frontend.md` section "Subscription-specific: Google Pay canMakePayment parameters" for details.

This doc contains the **complete integration flow** with request/response examples. Use it as the **authoritative reference** for implementation details.

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderAndPay.md`
2. `https://docs.payermax.com/api/New%20Version/en/v1.0/collectResultNotifyUrl.md`
3. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_orderQuery.md`
4. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_removePaymentToken.md`
5. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refund.md`
6. `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_refundQuery.md`
7. (If drop-in mode) `https://docs.payermax.com/api/New%20Version/en/v1.0/aggregate-pay_api_gateway_applyDropinSession.md`

### Step 3 (conditional): If integration_mode == drop_in

If the selected integration mode is `drop_in`, you MUST additionally:

1. Fetch the Drop-In frontend integration doc: `https://docs.payermax.com/en/202506-version/acquiring/start-integration/create-payment/frontend-component.md`
2. Read the local shared reference file: `references/shared/drop-in-frontend.md` — contains the official CDN URL, SDK initialization pattern, API version requirements, payment result handling, and test panel template.

**Hard rule:** Do NOT generate any Drop-In frontend code without completing Step 3. The frontend SDK has specific API surfaces (`PMdropin.create`, `mount`, `on`, `emit`) that cannot be guessed from general patterns.

## Binding modes

| Mode | `integrate` value | Notes |
|---|---|---|
| Cashier | `Hosted_Checkout` | Redirect to PayerMax page; simplest |
| Direct API | `Direct_Payment` | Merchant collects card info; needs `cardInfo`, `terminalType`, `osType` |
| Drop-in | `Direct_Payment` | Needs `/applyDropinSession` first; `paymentToken` + `sessionKey` from component |

**If integration_mode = drop_in:** Additionally read `references/shared/drop-in-frontend.md` for frontend SDK integration details (CDN loading, component lifecycle, test panel, payment result handling). This shared file contains only frontend-specific content with no standard-acquiring backend fields that could conflict with subscription parameters.

## Branch-specific fields

### Initial payment (bind)

| Field | Value | Notes |
|---|---|---|
| `integrate` | `Hosted_Checkout` or `Direct_Payment` | Depends on integration mode |
| `paymentDetail.tokenForFutureUse` | `true` | Request token generation |
| `paymentDetail.merchantInitiated` | `false` | User is present |
| `paymentDetail.mitType` | `UNSCHEDULED` | Non-periodic auto debit |
| `totalAmount` | 0 or > 0 | 0 = bind only; > 0 = bind + charge |

### Subsequent deductions

| Field | Value | Notes |
|---|---|---|
| `integrate` | `Direct_Payment` | Fixed value for all subsequent deductions |
| `paymentDetail.paymentTokenID` | stored token | From initial payment callback |
| `paymentDetail.merchantInitiated` | `true` | No user interaction |
| `paymentDetail.mitType` | `UNSCHEDULED` | Non-periodic auto debit |
| `paymentDetail.tokenForFutureUse` | `false` | No need to generate new token |
| `totalAmount` | > 0 | Variable amount per deduction |

Note: Unlike merchant-manage, non-periodic auto debit does NOT use `subscriptionPlan` in subsequent deductions.

### Unbind payment method

| Field | Value | Notes |
|---|---|---|
| `userId` | string | User's ID (same as used in binding) |
| `paymentTokenID` | stored token | The token to remove |
| `removeReason` | string | Reason for unbinding |

## Key difference from merchant-manage

| Scenario | mitType | Meaning |
|---|---|---|
| Merchant Manage (periodic) | `SCHEDULED` | Fixed billing cycle |
| Non-Periodic Auto Debit | `UNSCHEDULED` | On-demand, no fixed cycle |

This affects card network compliance (Visa/MC MIT rules). Amount can vary between deductions.

## Token management

- `paymentTokenID` is returned in the initial payment callback — persist it securely
- One token per user per payment method — reuse for all subsequent deductions
- Token remains valid until unbind or expiry; if invalid, user must re-bind
- When user cancels, call `/removePaymentToken` — do not just delete from local DB
- After successful unbind, `paymentTokenStatus: "Deleted"` — remove from storage

## Guardrails

- Do not confuse `SCHEDULED` (periodic) with `UNSCHEDULED` (non-periodic) — wrong `mitType` causes compliance issues
- Do not confuse `merchantInitiated: false` (initial) with `merchantInitiated: true` (subsequent)
- Do not lose the `paymentTokenID` — only way to charge without user interaction
- Do not skip 3DS/authentication on initial payment — required for card binding
- Do not charge without a valid business reason — card networks monitor MIT transactions
- Callback handler must be idempotent
- Subsequent deductions must use `integrate: "Direct_Payment"`
- Binding result must be obtained via BOTH callback (`collectResultNotifyUrl`) AND query fallback (`/orderQuery`) — do not rely solely on callback; implement both for production reliability

## Do not use this branch when

- Merchant wants PayerMax to handle periodic deduction automatically → `pmx-manage.md`
- Billing has a fixed periodic schedule → `merchant-manage.md`
- This is a one-time payment → use acquiring standard variants
