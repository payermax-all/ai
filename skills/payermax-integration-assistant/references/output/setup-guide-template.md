# PayerMax Integration Setup Guide

## 🎯 Overview

This project integrates PayerMax **{product}** using **{integration_mode}** mode with **{payment_methods}** payment method(s).
Tech stack: **{tech_stack}**.

## Prerequisites

### Option A: Automatic Setup (Recommended)

Install the PayerMax Developer MCP Server for zero-configuration sandbox setup:

1. Add to your IDE's MCP configuration:
   ```json
   {
     "mcpServers": {
       "payermax-developer": {
         "command": "npx",
         "args": ["-y", "payermax-developer-mcp-server@latest"]
       }
     }
   }
   ```

2. Ask your AI agent to authenticate:
   > "Authenticate with PayerMax Developer Center"

3. The browser opens PayerMax Developer Center automatically. Sign in if required.
   Sandbox authorization completes automatically after sign-in; no verification
   code or additional confirmation is required. If the browser cannot be opened,
   copy the complete verification URL returned by the agent into your browser.

4. All sandbox credentials will be automatically configured.

### Option B: Manual Setup

If not using the MCP Server, obtain credentials from the [PayerMax Developer Center](https://developer.payermax.com):
1. Sign in and navigate to the dashboard
2. Copy merchantNo and appId
3. View or download your sandbox keypair
4. Download the PayerMax public key

## ✅ What has been generated

### Completed deliverables
- ✅ **Configuration file**: `{config_file_path}` with all required PayerMax keys
- ✅ **Core integration code**: {describe_core_modules}
- ✅ **Request signing utility**: SHA256WithRSA sign + verify
- ✅ **Connectivity tests**: `{test_file_path}`
<!-- Include if integration_mode = drop_in -->
- ✅ **Frontend page**: Drop-In component integration with test helper panel
<!-- Include if product = Subscription -->
- ✅ **Subscription management**: Plan creation, activation, deduction handling

### RSA keypair status
<!-- If keypair was generated successfully: -->
```
Private Key: ✓ Generated and configured
Public Key:  ✓ Generated and configured
```
<!-- If keypair generation failed or was skipped: -->
```
Private Key: ⚠️ TODO — generate via https://developer.payermax.com/devtool/generate
Public Key:  ⚠️ TODO — generate via https://developer.payermax.com/devtool/generate
```

## 🚀 Quick Start

### Step 1: PayerMax Developer Center configuration

1. **Register account**: Visit [PayerMax Developer Center](https://developer.payermax.com)
2. **Create application**: Obtain `app-id` and `merchant-no`
3. **Upload merchant public key**: Copy the merchant public key from your config to the Developer Center
4. **Download PayerMax public key**: Fill into `payermax-public-key` in your config
<!-- Include if product = Subscription -->
5. **Enable subscription capability**: Contact PayerMax support to enable subscription for your merchant account

Reference: https://docs.payermax.com/en/202506-version/acquiring/integration-guide.html

### Step 2: Update configuration

Edit `{config_file_path}`:

```
{generate_config_snippet_with_TODO_comments_for_values_that_need_filling}
```

Key fields to fill:
- `app-id` / `APP_ID`: from Developer Center
- `merchant-no` / `MERCHANT_NO`: from Developer Center
- `payermax-public-key` / `PAYERMAX_PUBLIC_KEY`: download from Developer Center
- `notify-url` / `NOTIFY_URL`: your publicly accessible callback URL

### Step 3: Run connectivity tests

```bash
{test_run_command}
```

Expected: each API endpoint returns a response (business-level errors are OK — connectivity is confirmed if a response is received).

### Step 4: Start application

```bash
{start_command}
```

### Step 5: Test payment flow

#### Sandbox simulation tips

- **Control payment result**: Use the `subject` field in the `/orderAndPay` request to simulate different outcomes (`SUCCESS` / `FAILED` / `PENDING` / `3DS`)
- **Refund simulation**: Use local currency amount `10000` or `102` to trigger refund failure, `20000` or `202` to trigger refund pending; other amounts default to refund success
- **Full test card numbers, APM simulation rules, Apple Pay / Google Pay sandbox setup** — see:
  https://docs.payermax.com/en/202506-version/receipt/test-cases.html

<!-- Include the section matching the integration mode / product -->

#### For Cashier mode (full_payment_method / specified_payment_method):
1. Create a payment order (call your create-payment endpoint)
2. Open the returned `redirectUrl` in browser
3. Complete payment on PayerMax cashier page using test credentials
4. Verify callback received and order status updated
5. Test refund flow if applicable

#### For Drop-In mode:
1. Open demo page at `{demo_url}`
2. Fill order information and initialize payment session
3. Enter test card details in the Drop-In component
4. Submit payment and verify status updates
5. Test refund flow if applicable

#### For Tokenization (any integration mode):
1. Complete a first payment with the "save payment method" option accepted
2. Verify `paymentTokenID` is present in the payment result callback
3. Query the saved token list for that user and confirm the new card appears
4. Start a second payment using `paymentTokenID` only (no card details)
5. Remove the token and confirm the list updates and the token can no longer be used

#### For Subscription (PMX Manage):
1. Create a subscription plan (call your create-plan endpoint)
2. Activate the plan (complete first payment)
3. Verify subscription activated callback received
4. Wait for periodic deduction callback (or use sandbox time simulation)
5. Test subscription cancellation

#### For Subscription (Merchant Manage / Auto Debit):
1. Complete initial payment to bind payment method
2. Verify `paymentTokenID` returned in callback
3. Initiate a subsequent deduction using the stored token
4. Verify deduction result callback received
5. Test refund for individual deductions if applicable

## 🧪 Sandbox Testing Reference

Full sandbox testing guide (test card numbers, APM simulation, Apple Pay / Google Pay sandbox setup, refund simulation rules):

👉 https://docs.payermax.com/en/202506-version/receipt/test-cases.html

Key points:
- The `subject` field controls payment result simulation (applies to all payment methods)
- Card testing does not perform actual charges — only format validation
- APM redirects to a result selection page in sandbox
- Refund uses fixed amounts to trigger different outcomes

## 🔧 API endpoints

{generate_endpoint_table_based_on_actual_implementation}

<!-- Example format: -->
| Method | Path | Description |
|---|---|---|
| POST | /payermax/payment/create | Create payment order |
| POST | /payermax/callback/payment | Payment result callback |
| GET | /payermax/order/query/{outTradeNo} | Query payment status |
| POST | /payermax/refund/create | Initiate refund |
| POST | /payermax/callback/refund | Refund result callback |

## 🔍 Troubleshooting

### 1. Signature verification failed
- Check private key / public key format in config (single-line Base64, no PEM headers)
- Confirm keypair matches (sign with private → verify with public)
- Run connectivity test to verify signing works

### 2. API call returns error
- Verify `app-id` and `merchant-no` are correct
- Check network connectivity to PayerMax sandbox (`pay-gate-uat.payermax.com`)
- Confirm `version` and `keyVersion` match API docs

### 3. Callback not received
- Confirm `notify-url` is publicly accessible from overseas networks
- Check firewall inbound rules
- Verify callback endpoint returns exact ack format: `{"code":"SUCCESS","msg":"Success"}`

### 4. Drop-In component issues (if applicable)
- Check browser console for JavaScript errors
- Verify CDN script loaded: `https://cdn.payermax.com/dropin/js/pmdropin.min.js`
- Confirm `clientKey` and `sessionKey` from `/applyDropinSession` are valid
- Ensure `mount()`, `on()`, `emit()` are called on the instance returned by `PMdropin.create()`, not on the global `PMdropin` object
- 3DS popup blocked by the browser — `create3DSPopup` must be called directly in the user-gesture path, not after an unrelated async gap
- Pay button stays disabled after the user closes the 3DS window — handle `USER_CANCEL` and re-enable it
- Order marked paid too early — `3DS_PROCESSED` means authentication finished, not that the payment succeeded; wait for the callback or `/orderQuery`

### Debug steps
```bash
# Network connectivity check
curl -v https://pay-gate-uat.payermax.com/aggregate-pay/api/gateway/orderQuery

# Run connectivity tests
{test_run_command}
```

### Additional help

- FAQ - Cashier & Direct API: https://docs.payermax.com/en/202506-version/appendix/faq/collection/cashier-direct-api.html
- FAQ - Technical Problems: https://docs.payermax.com/en/202506-version/appendix/faq/collection/technical-problem.html
- Submit a support ticket: https://docs.payermax.com/en/202506-version/appendix/faq/ticket.html

## 🏗️ Production go-live checklist

- [ ] Update `base-url` to production: `https://pay-gate.payermax.com`
- [ ] Configure production credentials (app-id, merchant-no, keys)
- [ ] Update `notify-url` to production callback endpoint
- [ ] Confirm callback URL is reachable from overseas networks
- [ ] Enable payment methods in PayerMax Developer Center
- [ ] Payment methods enabled via `sandbox_update_payment_methods` in sandbox are separately contracted for production
- [ ] Payment state in shared DB/cache, not process memory (multi-instance safe)
- [ ] Logs mask `paymentTokenID`, card masks, email, and signatures
<!-- Include if integration_mode = drop_in -->
- [ ] `sandbox` set to `false` in production (Drop-In SDK)
<!-- Include if payment methods include APPLEPAY -->
- [ ] Apple Pay domain verification file publicly reachable
<!-- Include when tokenization_enabled = true -->
- [ ] Token queries scoped to the authenticated user
- [ ] Saved-card removal available to end users
<!-- Include if product = Subscription -->
- [ ] Confirm subscription capability enabled for production merchant
