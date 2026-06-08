# Subscription — PayerMax Manage Subscription Plans

Use this variant when the merchant wants PayerMax to manage the full subscription lifecycle: plan creation, activation, periodic auto-deduction, retry on failure, and notification.

## Choose this branch when

- `customer_product: receipt_subscription`
- `subscription_scenario: pmx_manage_plan`

## Product overview

PayerMax manages the subscription plan lifecycle end-to-end:

1. Merchant creates a subscription plan via API
2. User activates the plan (first payment via cashier/API/drop-in)
3. PayerMax automatically deducts per period
4. PayerMax retries on failure per configured strategy
5. PayerMax notifies merchant of deduction results and plan status changes

The merchant does NOT need to initiate subsequent deductions — PayerMax handles them automatically.

## Integration flow

```
Create Plan → Activate (first payment) → [PayerMax auto-deducts per period] → Receive callbacks → [Optional] Cancel/Query
```

1. **Create subscription plan** — `/subscriptionCreate` with plan details
2. **Activate subscription** — `/orderAndPay` (user completes first payment)
3. **Receive activation result** — via callbacks (see Callback handling table)
4. **Receive per-period deduction results** — `subscriptionPaymentResultNotifyUrl` callback
5. **Receive plan status changes** — `subscriptionResultNotifyUrl` callback
6. **Query subscription** — `/subscriptionQuery`
7. **Cancel subscription** — `/subscriptionCancel`
8. **Refund** — `/refund` using `tradeToken` from deduction callback

## Key APIs

| API | Purpose |
|---|---|
| `/subscriptionCreate` | Create subscription plan (standard / trial / promotional) |
| `/orderAndPay` | Activate subscription (first payment, binds payment method) |
| `/applyDropinSession` | Get clientKey/sessionKey for drop-in component (drop-in mode only) |
| `/subscriptionQuery` | Query subscription plan status and deduction history |
| `/subscriptionCancel` | Cancel subscription plan |
| `subscriptionPaymentResultNotifyUrl` | Per-period deduction result callback (via callbackUrl) |
| `subscriptionResultNotifyUrl` | Subscription plan status change callback (via callbackUrl) |
| `collectResultNotifyUrl` | Activation payment result callback (via notifyUrl in orderAndPay) |
| `/refund` | Refund a specific period's deduction (using tradeToken from callback) |
| `/refundQuery` | Query refund status |

## Fetch docs before writing code

### Step 1: Fetch payment-method-specific integration doc

Based on the user's selected payment method type, fetch the corresponding integration doc. If multiple payment methods selected, fetch ALL.

| Payment Method | URL to fetch |
|---|---|
| CARD | `https://docs-v2.payermax.com/en/doc-center/receipt/subscription/subscription-integration.md` |
| APM | `https://docs-v2.payermax.com/en/doc-center/receipt/subscription/apm/subscription-integration.md` |
| APPLEPAY | `https://docs-v2.payermax.com/en/doc-center/receipt/subscription/applepay/subscription-pmx-management.md` |
| GOOGLEPAY | `https://docs-v2.payermax.com/en/doc-center/receipt/subscription/googlepay/subscription-pmx-management.md` |

This doc contains the **complete integration flow** with request/response examples. Use it as the **authoritative reference** for implementation details.

### Step 2: Fetch API docs

1. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_subscriptionCreate.md`
2. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_orderAndPay.md`
3. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_subscriptionQuery.md`
4. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_subscriptionCancel.md`
5. `https://docs.payermax.com/api/cn/subscriptionPaymentResultNotifyUrl.md`
6. `https://docs.payermax.com/api/cn/subscriptionResultNotifyUrl.md`
7. `https://docs.payermax.com/api/cn/collectResultNotifyUrl.md`
8. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_refund.md`
9. `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_refundQuery.md`
10. (If drop-in mode) `https://docs.payermax.com/api/cn/aggregate-pay_api_gateway_applyDropinSession.md`

### Step 3 (conditional): If integration_mode == drop_in

If the selected integration mode is `drop_in`, you MUST additionally:

1. Fetch the Drop-In frontend integration doc: `https://docs-v2.payermax.com/en/doc-center/acquiring/start-integration/create-payment/frontend-component.md`
2. Read the local shared reference file: `references/shared/drop-in-frontend.md` — contains the official CDN URL, SDK initialization pattern, API version requirements, payment result handling, and test panel template.

**Hard rule:** Do NOT generate any Drop-In frontend code without completing Step 3. The frontend SDK has specific API surfaces (`PMdropin.create`, `mount`, `on`, `emit`) that cannot be guessed from general patterns.

## Subscription plan types

| Plan Type | Configuration in subscriptionCreate | totalAmount at activation |
|---|---|---|
| **Standard** | Only `periodAmount` | = `periodAmount.amount` |
| **n-day Trial** | + `trialConfig` (trialAmount, trialDays) | = `trialConfig.trialAmount.amount` (can be 0) |
| **First n Periods Promotional** | + `trialPeriodConfig` (trialPeriodCount, trialPeriodAmount) | = `trialPeriodAmount.amount` (can be 0) |
| **Trial + Promotional** | Both `trialConfig` + `trialPeriodConfig` | = `trialConfig.trialAmount.amount` (can be 0) |

## Activation field constraints

| Field in orderAndPay | Constraint |
|---|---|
| `currency` | Must match `subscriptionPlan.periodAmount.currency` |
| `userId` | Must match `subscriptionCreate`'s userId |
| `subject` | Must match `subscriptionCreate`'s subject |
| `totalAmount` | Depends on plan type (see table above) |
| `subscriptionPlan.subscriptionNo` | Required — from `/subscriptionCreate` response |
| `paymentDetail.mitType` | `SCHEDULED` |
| `paymentDetail.tokenForFutureUse` | `true` |
| `paymentDetail.merchantInitiated` | `false` (user is present for activation) |

## Activation modes

| Mode | `integrate` value | Notes |
|---|---|---|
| Cashier | `Hosted_Checkout` | Redirect to PayerMax page; simplest |
| Direct API | `Direct_Payment` | Merchant collects card info; needs `cardInfo`, `terminalType`, `osType` |
| Drop-in | `Direct_Payment` | Needs `/applyDropinSession` first; `paymentToken` + `sessionKey` from component |

**If integration_mode = drop_in:** Additionally read `references/shared/drop-in-frontend.md` for frontend SDK integration details (CDN loading, component lifecycle, test panel, payment result handling). This shared file contains only frontend-specific content with no standard-acquiring backend fields that could conflict with subscription parameters.

## Subscription plan status mapping

| Status | Meaning | Action |
|---|---|---|
| INACTIVE | Plan created, not yet activated | Wait for user to activate (expires after 24h) |
| ACTIVE | Plan activated, deductions running | Normal state |
| ACTIVE_FAILED | Activation failed | Retry or investigate |
| TERMINATE | Terminated due to payment failure | Inform user, offer re-subscribe |
| CANCEL | Merchant/user cancelled | Final state |
| FINISH | All periods completed | Final state |
| EXPIRED | Not activated within 24h | Create new plan |

## Deduction status mapping

| Status | Meaning |
|---|---|
| PENDING | Debit in progress (PayerMax may be retrying) |
| SUCCESS | Debit successful — fulfill for this period |
| FAILED | Debit failed after all retries |

## Callback handling

Three separate callback channels — do not confuse them:

| Callback | Trigger | Source URL config | notifyType |
|---|---|---|---|
| `collectResultNotifyUrl` | Activation payment result | `notifyUrl` in orderAndPay | `PAYMENT` |
| `subscriptionResultNotifyUrl` | Plan status changes | `callbackUrl` in subscriptionCreate | `SUBSCRIPTION` |
| `subscriptionPaymentResultNotifyUrl` | Per-period deduction result | `callbackUrl` in subscriptionCreate | `SUBSCRIPTION_PAYMENT` |

All callbacks: idempotent, acknowledge with `{"msg":"Success","code":"SUCCESS"}`.

## Key constraints

- Plan must be activated within **24 hours** of creation; otherwise expires
- Total plan duration must not exceed **3 years**
- Deduction failure notification is delayed — sent only after all retry attempts fail
- Cannot cancel while latest period deduction is PENDING — must wait until SUCCESS or FAILED
- Each deduction callback includes `lastPaymentInfo.tradeToken` — use for refunds
- Do not treat `INACTIVE` as an error — normal post-creation state

## Guardrails

- Do not hardcode subscription plan parameters — make them configurable
- Do not assume deduction happens immediately after plan creation — activation required first
- Do not poll for deduction results — rely on callbacks with query fallback
- Do not confuse the three callback channels (see table above)
- Do not attempt to cancel while a period deduction is PENDING
- `version` and `keyVersion` must come from API docs — do not assume values

## Do not use this branch when

- Merchant wants to control billing timing and initiate each deduction → `merchant-manage.md`
- Billing is non-periodic / on-demand → `auto-debit.md`
- This is a one-time payment → use acquiring standard variants
