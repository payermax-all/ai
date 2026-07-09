# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-21

### Added
- Initial release
- OAuth2 Device Flow authentication (authenticate, check_auth_status, revoke_token)
- Sandbox configuration retrieval (get_sandbox_config)
- Notification URL management (sandbox_configure_notify_url)
- Payment methods management (sandbox_query_payment_methods, sandbox_update_payment_methods)
- Acceptance testing (sandbox_trigger_acceptance, sandbox_get_acceptance_status)
- Order queries (sandbox_query_orders, sandbox_query_subscription_detail, sandbox_resend_notification)
- Dispute management (sandbox_dispute_query, sandbox_dispute_create, sandbox_dispute_reply, sandbox_dispute_close)
- Subscription mocking (sandbox_subscription_mock_period, sandbox_subscription_mock_resend)

### Tool Changes
- `authenticate`: Initiates Device Flow, returns verification URL and user code
- `check_auth_status`: Reports current auth state (authenticated/polling/not authenticated)
- `revoke_token`: Revokes token server-side and clears local credentials
- `get_sandbox_config`: Returns complete sandbox config (merchantNo, appId, keypair, PayerMax public key, notifyUrl)
- `sandbox_configure_notify_url`: Updates sandbox notification callback URL
- `sandbox_query_payment_methods`: Lists contracted payment methods
- `sandbox_update_payment_methods`: Enables/disables payment methods
- `sandbox_trigger_acceptance`: Triggers sandbox acceptance testing
- `sandbox_get_acceptance_status`: Queries acceptance test case status
- `sandbox_query_orders`: Queries orders by type (trade/pay/disburse/paylink/subscription)
- `sandbox_query_subscription_detail`: Queries deduction records for a subscription
- `sandbox_resend_notification`: Resends webhook notification for a trade order
- `sandbox_dispute_query`: Queries dispute case information
- `sandbox_dispute_create`: Creates mock dispute/chargeback case
- `sandbox_dispute_reply`: Replies to dispute case
- `sandbox_dispute_close`: Closes dispute case with judgement
- `sandbox_subscription_mock_period`: Mocks subscription deduction result
- `sandbox_subscription_mock_resend`: Resends subscription deduction notification
