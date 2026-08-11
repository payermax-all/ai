# Changelog

## 1.0.0 (2026-08-11)

Initial release.

### Features

- **Authentication**: OAuth2 Device Flow with automatic browser open and polling
- **Sandbox Configuration**: Query merchant config (appId, merchantNo, keys, notifyUrl)
- **Key Management**: Generate RSA keypair (auto-upload public key) or upload existing public key
- **Notification URLs**: Configure callback URLs for all 12 notification types (PAYMENT, REFUND, DISPUTE, etc.)
- **Payment Methods**: Query and enable/disable contracted payment methods per product code
- **Acceptance Testing**: Query and refresh sandbox acceptance status with structured pass/fail summary
- **Order Queries**: Query trade, pay, disburse, paylink, and subscription orders (exact lookup or latest 15)
- **Subscription Details**: Query per-period deduction records for a subscription plan
- **Notification Resend**: Resend webhook notifications for trade orders
- **Disputes**: Query, create, reply, and close mock dispute/chargeback cases (by merchant order number)
- **Subscription Mock**: Simulate deduction period results (success/failure) and resend deduction notifications

### Tools (19)

| Tool | Category |
|------|----------|
| `authenticate` | Auth |
| `check_auth_status` | Auth |
| `revoke_token` | Auth |
| `get_sandbox_config` | Configuration |
| `sandbox_generate_keypair` | Configuration |
| `sandbox_upload_merchant_public_key` | Configuration |
| `sandbox_configure_notify_url` | Configuration |
| `sandbox_query_payment_methods` | Configuration |
| `sandbox_update_payment_methods` | Configuration |
| `sandbox_get_acceptance_status` | Acceptance |
| `sandbox_query_orders` | Orders |
| `sandbox_query_subscription_detail` | Orders |
| `sandbox_resend_notification` | Orders |
| `sandbox_dispute_query` | Disputes |
| `sandbox_dispute_create` | Disputes |
| `sandbox_dispute_reply` | Disputes |
| `sandbox_dispute_close` | Disputes |
| `sandbox_subscription_mock_period` | Subscription |
| `sandbox_subscription_mock_resend` | Subscription |

### Security

- Token stored locally at `~/.payermax/credentials.json` with `0600` permissions
- Verification URL whitelist: `*.payermax.com` only
- HTTPS-only callback URL validation
- `prepack` guard prevents publishing with non-production API base URL
