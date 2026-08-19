---
name: payermax-integration-assistant
description: Use this skill when a developer wants to design, implement, review, or troubleshoot a PayerMax payment integration — including standard acquiring (cashier, drop-in) and subscription billing (PayerMax-managed plans, merchant-managed plans, non-periodic auto debit). It understands business requests, normalizes scenarios, generates solution documents, and produces implementation code.
---

# PayerMax Integration Assistant

Single entry skill for all PayerMax payment integration help.

## Features

- Full-Scenario Payment Products: Standard Acquiring, Subscription
- Smart Product Decision — Recommends the most suitable payment product based on business scenario and keywords
- Troubleshooting — Error code lookup and common issue solutions, including dedicated invalid-signature diagnosis

## Supported Payment Products & Scenario

| Payment Product | Scenario | Payment Method Type | Integration Mode | Core API Name | Variant file |
| --- | --- | --- | --- | --- | --- |
| Standard Acquiring | default | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in, pay_by_link, direct_api | orderAndPay, createPaybylink | `references/variants/full-payment-method.md` / `specified-payment-method.md` / `drop-in.md` / `paybylink.md` / `direct-api.md` |
| Standard Acquiring | default | APM | cashier-full_payment_method, cashier-specified_payment_method, pay_by_link, direct_api | orderAndPay, createPaybylink | `references/variants/full-payment-method.md` / `specified-payment-method.md` / `paybylink.md` / `direct-api.md` |
| Subscription | pmx_manage_plan | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | subscriptionCreate + orderAndPay | `references/variants/subscription/pmx-manage.md` |
| Subscription | pmx_manage_plan | APM | cashier-full_payment_method, cashier-specified_payment_method | subscriptionCreate + orderAndPay | `references/variants/subscription/pmx-manage.md` |
| Subscription | merchant_manage_plan | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | orderAndPay (bind + debit) | `references/variants/subscription/merchant-manage.md` |
| Subscription | merchant_manage_plan | APM | cashier-full_payment_method, cashier-specified_payment_method | orderAndPay (bind + debit) | `references/variants/subscription/merchant-manage.md` |
| Subscription | non_periodic_auto_debit | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | orderAndPay (bind + debit) | `references/variants/subscription/auto-debit.md` |
| Subscription | non_periodic_auto_debit | APM | cashier-full_payment_method, cashier-specified_payment_method | orderAndPay (bind + debit) | `references/variants/subscription/auto-debit.md` |

**Constraint:** When Payment Method Type = APM, Integration Mode `drop_in` is not available.
**Constraint:** When Product = Subscription, Integration Mode `pay_by_link` is not available.
**Note:** Integration Mode `pay_by_link` and `direct_api` support all payment method types without restriction.
**Constraint:** Tokenization is an orthogonal dimension, not a product. It combines with `cashier-specified_payment_method`, `direct_api`, and `drop_in` (no APM), never with `cashier-full_payment_method` or `pay_by_link`.
**Routing:** When `tokenization_enabled: true`, pick the variant via `references/router.md`.

## Workflow overview

1. Understand the business request → normalize scenario → **stop for confirmation**
2. Generate `payermax_integration_solution.md` → **stop for confirmation**
3. After confirmation → generate implementation code

## Phase 1: Understand and route

First, analyze the user's project and request to infer context for recommendations:

- merchant business type, target country/market
- project tech stack and existing code patterns
- terminal: `web`, `h5`, `app`
- any subscription/recurring billing signals
- explicitly named payment methods or APM brands

Then follow the **structured clarification flow** below. Before asking any question, first analyze the **full conversation context** (all previous turns + current prompt) to infer answers for each step. Information confirmed or inferred in earlier turns remains valid — do not re-ask for it.

### Pre-inference rules (skip steps whose answers are already clear)

1. **Product (Step 1)**: If the user does NOT mention subscription/recurring/auto-debit/订阅/代扣/续费 keywords → auto-select **Standard Acquiring**, skip Step 1. If the user DOES mention these keywords → auto-select **Subscription**, skip Step 1.
2. **Scenario (Step 2)**: If product = Standard Acquiring → scenario = `default`, always skip Step 2.
3. **Integration Mode (Step 3)**: If the user does NOT clearly indicate a preference (cashier vs drop-in vs paybylink vs direct API) → must ask. This step is rarely skippable.
4. **Payment Methods (Step 4)**: If the user explicitly names payment methods or APM brands (e.g., "TNG", "DANA", "card payment", "信用卡") → auto-select the corresponding types, skip Step 4.
5. **APM specifics**: If the user already named specific APM methods (e.g., "TNG") or countries (e.g., "Malaysia", "马来西亚") → auto-select, skip the APM sub-step.
6. **Payment Methods for Full Cashier/PayByLink**: If integration mode = `cashier-full_payment_method` or `pay_by_link` → auto-select "All available payment methods", skip Step 4 and APM sub-step.
7. **Tokenization**: token/保存卡/记住卡/免密/二次支付/快捷支付/saved card/one-click → `tokenization_enabled: true`, skip. 一次性/游客支付/guest → `false`, skip.

**Inference examples:**

| User prompt | Inferred (skip) | Still need to ask |
| --- | --- | --- |
| "集成PayerMax的马来西亚的TNG支付方式" | Product=Standard Acquiring, Payment Method=APM, APM=TNG, Country=MY | Integration Mode |
| "I want monthly subscription billing with card" | Product=Subscription, Payment Method=Card | Scenario, Integration Mode |
| "Integrate PayerMax payment" | Product=Standard Acquiring | Integration Mode, Payment Methods |
| "用Apple Pay做定期扣款" | Product=Subscription, Payment Method=ApplePay | Scenario, Integration Mode |
| "接入PayerMax收银台" | Product=Standard Acquiring, Integration Mode=cashier | Payment Methods (full or specified?) |
| "接入PayerMax收银台，全量支付方式" | Product=Standard Acquiring, Integration Mode=cashier-full, Payment Methods=All | (none) |
| "集成PayerMax代扣，商户管理订阅计划，支付方式卡" | Product=Subscription, Scenario=merchant_manage_plan, Payment Method=Card | Integration Mode |
| "用前置组件收卡，下次支付免输卡号" | Standard Acquiring, drop_in, tokenization_enabled=true | Payment Methods |

**Flow rule:** Only stop and ask for steps where the answer cannot be confidently inferred from the full conversation history (all turns). If a step's answer was already stated or confirmed in any previous turn, skip it — do not re-ask. For inferred steps, state your inference clearly (e.g., "Based on your request, I've identified: Standard Acquiring, APM (TNG), Malaysia. Now I need to confirm one thing:") and proceed directly to the next unclear step.

For each step that DOES require asking, present the comparison table and wait for user selection.

### See all products (single select)

**Skip if:** 
- User prompt has no subscription/recurring/auto-debit/订阅/代扣/续费 keywords → auto-select Standard Acquiring and proceed.
- User prompt HAS subscription/recurring/auto-debit/订阅/代扣/续费/商户管理/订阅计划 keywords → auto-select Subscription and proceed.

Analyze the project for subscription signals (keywords: subscription, recurring, auto debit, 订阅, 定期扣款, 自动扣款, 续费, periodic payment, monthly billing, annual billing, usage-based billing, token reuse for recurring).

**Stop and ask:**

> Based on your project, I recommend: **[recommended product]** (reason: ...).
>
> Which payment product would you like to integrate? 
>
> | Product | Description | Best for Use Cases |
> | --- | --- | --- |
> | **Standard Acquiring（标准收单）** | One-time payment collection via checkout page or embedded components / 通过收银页面或嵌入式组件进行一次性收款 | E-commerce, digital goods, one-time purchases / 电商、数字商品、一次性购买 |
> | **Subscription（商家代扣）** | Recurring billing with automatic or merchant-initiated deductions / 自动或商户发起的周期性扣款 | SaaS, streaming, memberships, usage-based billing / SaaS、流媒体、会员、按量计费 |
>
> Product overview: https://docs.payermax.com/en/202606-version/acquiring/introduction.html#_2-step-2-choose-integration-solution
> Subscription overview: https://docs.payermax.com/en/202606-version/acquiring/start-integration/subscription-and-auto-debit/subscription-overview.html
>
> Please select one: **Standard Acquiring（标准收单）** / **Subscription（商家代扣）**

Wait for user selection. Then:
- Standard Acquiring → set `customer_product: acquiring_standard`, skip Step 2, proceed to Step 3
- Subscription → set `customer_product: receipt_subscription`, proceed to Step 2

### Which subscription scenario? (single select, Subscription only)

**Skip if:** Product = Standard Acquiring (always skip; scenario = `default`).

**Stop and ask:**

> Based on your project, I recommend: **[recommended scenario]** (reason: ...).
>
> Which subscription scenario fits your business? 
>
> | Scenario | Description | Best for Use Cases |
> | --- | --- | --- |
> | **pmx_manage_plan（PayerMax管理订阅计划）** | PayerMax manages the full plan lifecycle: creation, activation, periodic auto-deduction, retry, notification / PayerMax 管理完整计划生命周期：创建、激活、周期自动扣款、重试、通知 | Standard SaaS/streaming with fixed billing cycles / 标准 SaaS/流媒体，固定计费周期 |
> | **merchant_manage_plan（商户管理订阅计划）** | Merchant controls billing timing; binds payment method first, then initiates each periodic debit via token / 商户控制扣款时机；先绑定支付方式，再通过 token 发起每次周期扣款 | Custom billing logic, variable amounts per period / 自定义计费逻辑，每期金额可变 |
> | **non_periodic_auto_debit（非周期性自动扣款）** | Merchant initiates on-demand debits using stored token; no fixed schedule / 商户使用存储的 token 按需发起扣款；无固定周期 | Usage-based billing, top-ups, pay-as-you-go / 按量计费、充值、按需付费 |
>
> Scenarios comparison: https://docs.payermax.com/en/202606-version/acquiring/start-integration/subscription-and-auto-debit/subscription-overview.html
>
> Please select one: **pmx_manage_plan** / **merchant_manage_plan** / **non_periodic_auto_debit**

Wait for user selection. Then:
- `subscription_scenario: pmx_manage_plan`
- `subscription_scenario: merchant_manage_plan`
- `subscription_scenario: non_periodic_auto_debit`

### Build a payments page (single select)

**Skip if:** User explicitly states cashier, drop-in, paybylink, or direct API preference in their prompt (e.g., "收银台", "cashier", "前置组件", "drop-in", "embed component", "链接支付", "paybylink", "支付链接", "纯API", "direct API", "自建收银页"). Otherwise, must ask.

**Tokenization-aware:** If `tokenization_enabled` was already inferred `true`, drop `cashier-full_payment_method` and `pay_by_link` from both the recommendation and the options, saying why: "全量收银台与链接支付不支持 Token，已排除 / excluded — they do not support tokenization."

Analyze the project for frontend complexity signals (custom checkout page with card form / 3DS handling → direct_api; custom checkout page with embedded components → drop_in; no frontend / simple redirect → cashier; offline/sharing scenarios → pay_by_link).

**Stop and ask:**

> Based on your project, I recommend: **[recommended mode]** (reason: ...).
>
> Which Checkout Page Construction Method would you like to use?
>
> | Checkout Page Construction Method | Description | Best for Use Cases |
> | --- | --- | --- |
> | **cashier-full_payment_method（全量收银台）** | PayerMax hosts the full payment page, displays all available payment methods / PayerMax 托管完整支付页面，展示所有可用支付方式 | Fastest integration; no frontend work; maximum payment method coverage / 最快集成；无需前端开发；支付方式覆盖最全 |
> | **cashier-specified_payment_method（指定支付方式）** | PayerMax hosts the payment page, but only shows payment methods you specify / PayerMax 托管支付页面，但仅展示您指定的支付方式 | When you want to control which methods are shown / 需要控制展示哪些支付方式时 |
> | **drop_in（前置组件）** | Embed PayerMax UI components (card form, Google Pay, Apple Pay) on your own page / 在您自己的页面嵌入 PayerMax UI 组件（卡表单、Google Pay、Apple Pay） | Custom UX without PCI-DSS; only supports Card/ApplePay/GooglePay (not APM) / 自定义体验且无需 PCI-DSS；仅支持 Card/ApplePay/GooglePay（不支持 APM） |
> | **paybylink（链接支付）** | Generate a payment link that users access via URL or QR code; PayerMax hosts the payment page / 生成支付链接，用户通过 URL 或二维码访问；PayerMax 托管支付页面 | Offline scenarios, social sharing, no redirect flow needed; supports all payment methods; Standard Acquiring only (not available for Subscription) / 线下场景、社交分享、无需重定向流程；支持所有支付方式；仅标准收单可用（订阅代扣不可用） |
> | **direct_api（纯API）** | Merchant builds their own checkout page; full control over UX; requires handling redirects and 3DS/wallet authentication / 商户自建收银页面；完全控制 UX；需处理重定向和 3DS/钱包认证 | Maximum customization; higher development cost. ⚠️ Card payments require PCI-DSS certification ([details](https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/card/pcidss.html)) / 最大化定制；开发成本较高。⚠️ 卡支付须持有 PCI-DSS 认证 |
>
> Checkout Page Construction Method comparison: https://docs.payermax.com/en/202606-version/acquiring/introduction.html#_2-step-2-choose-integration-solution
> Drop-In component guide: https://docs.payermax.com/en/202606-version/acquiring/start-integration/payment-acceptance/drop-in/card.html
> Live demo (try each checkout experience): https://docs.payermax.com/payDemo/index.html
>
> Please select one: **cashier-full_payment_method（全量收银台）** / **cashier-specified_payment_method（指定支付方式）** / **drop_in（前置组件）** / **paybylink（链接支付）** / **direct_api（纯API）**

Wait for user selection. Then set `integration_mode` accordingly:
- `cashier-full_payment_method` → `integration_mode: cashier`, `cashier_variant: full_payment_method`
- `cashier-specified_payment_method` → `integration_mode: cashier`, `cashier_variant: specified_payment_method`
- `drop_in` → `integration_mode: drop_in`
- `paybylink` → `integration_mode: pay_by_link`
- `direct_api` → `integration_mode: direct_api`

**Tokenization conflict guard.** Run once `integration_mode` is set, from this step or from pre-inference. If `tokenization_enabled: true` and the mode is incompatible:

- `cashier-full_payment_method` → **auto-rewrite** to `cashier-specified_payment_method` and tell the user: "Tokenized payment is not supported in the full checkout. It has been automatically changed to the specified payment method checkout." Step 4 then becomes mandatory; `payment_method_type` can no longer default to "all".
- `pay_by_link` → **stop and ask**, never auto-rewrite: tokens need a signed-in user, pay-by-link has no session, so there is no equivalent target.

  > Tokenized payment is not supported in Link payment scenarios, as it requires a logged-in user and an interface for managing saved cards. Choose:
  > - Keep pay-by-link, drop tokenization
  > - Switch to specified-payment-method cashier

Never silently set `tokenization_enabled: false` to resolve this conflict.

**PCI-DSS compliance gate.** Run once `integration_mode` is set. Trigger condition: `integration_mode: direct_api` AND (`payment_method_type` includes CARD, or payment method is not yet determined but user mentioned card/银行卡/信用卡).

Skip if: payment method is confirmed as APM-only / Apple Pay-only / Google Pay-only (no CARD).

**Stop and ask:**

> ⚠️ Direct API + Card requires valid PCI-DSS certification — your server will handle raw card data (PAN/CVV/expiry). Sandbox development is not blocked, but production volume cannot be enabled without certification.
>
> Your situation?
> - **Already certified** → continue (submit proof to PayerMax, review ~1-3 days)
> - **Not certified, don't want the cost** → recommend switching to `drop_in`（same custom UX, no PCI-DSS）or `cashier-specified_payment_method`
> - **Planning to certify, want to start sandbox dev now** → continue with direct_api
>
> PCI-DSS guide: https://docs.payermax.com/en/202506-version/acquiring/start-integration/integrate-by-payment-method/card/pcidss.html

If user chooses "not certified + switch" → re-run Step 3 with the chosen alternative mode.
If user chooses "certified" or "planning" → proceed; append to `scenario_profile.notes` (e.g., `"PCI-DSS: certified"` or `"PCI-DSS: in_progress, sandbox only"`).

### Save payment methods for future use? (single select)

**Skip if:** pre-inference rule 7 already resolved it, OR Integration Mode = `cashier-full_payment_method` / `pay_by_link` **and** tokenization was NOT inferred → auto-select No. If it WAS inferred `true` under those two modes, apply the conflict guard above instead of dropping it.

**Stop and ask:**

> Save the user's payment method for future payments?
>
> - **Yes — enable tokenized payment**: later payments reuse `paymentTokenID`; a saved-card management UI (list + remove) is mandatory.
> - **No — one-time only**: every payment requires full input.
>
> https://docs.payermax.com/en/202506-version/receipt/tokenization/introduction.html
>
> Please select: **Yes** / **No**

Set `tokenization_enabled`. If `true`, default `token_type: payermax_token` unless the merchant runs its own vault.

### Add payment methods

**Skip if:** 
- User explicitly names payment methods or APM brands in the prompt (e.g., "TNG", "DANA", "card", "Apple Pay", "信用卡") → auto-select the corresponding payment method types and skip this step.
- Integration Mode = `cashier-full_payment_method` or `pay_by_link` → auto-select "All available payment methods", skip this step and APM sub-step.

Analyze the project for target market signals (Southeast Asia → Card + APM; Global/US/EU → Card; etc.).

Available options depend on Step 3 selection:

**If Integration Mode = `drop_in`:**

**Stop and ask:**

> Based on your project's target market, I recommend: **[recommended methods]** (reason: ...).
>
> Which payment methods would you like to support? (select one or more) 
>
> | Payment Method | Description | Supported Regions  |
> | --- | --- | --- |
> | **Card（银行卡）** | Visa, Mastercard, JCB, Discover, Diners Club | Global  |
> | **ApplePay** | Apple Pay (requires macOS 13+ / iOS 16+ for subscription) | Global  |
> | **GooglePay** | Google Pay (requires Android 8+ / Chrome 90+ for subscription) | Global  |
>
> ⚠️ Note: APM is not available in drop_in mode. 
>
> Payment method list: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/payment-method-list/standard-acquiring-products.html
> Subscription payment methods: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/payment-method-list/subscription-and-auto-debit.html
> Supported countries & currencies: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/supported-countries-currencies-and-languages.html
>
> Please select one or more: **Card** / **ApplePay** / **GooglePay**

**If Integration Mode = `cashier-*`:**

**Stop and ask:**

> Based on your project's target market, I recommend: **[recommended methods]** (reason: ...).
>
> Which payment methods would you like to support? (select one or more) 
>
> | Payment Method | Description | Supported Regions  |
> | --- | --- | --- |
> | **Card（银行卡）** | Visa, Mastercard, JCB, Discover, Diners Club | Global |
> | **ApplePay** | Apple Pay (requires macOS 13+ / iOS 16+ for subscription) | Global |
> | **GooglePay** | Google Pay (requires Android 8+ / Chrome 90+ for subscription) | Global |
> | **APM（本地支付方式）** | Local payment methods: e-wallets (DANA, KakaoPay, NaverPay, TNG, etc.), bank transfer, etc. | Region-specific |
>
> Payment method list: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/payment-method-list/standard-acquiring-products.html
> Subscription payment methods: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/payment-method-list/subscription-and-auto-debit.html
> Supported countries & currencies: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/supported-countries-currencies-and-languages.html
>
> Please select one or more: **Card** / **ApplePay** / **GooglePay** / **APM**

Agent internal reference (for fetching content, use `.md` URLs):
- Payment method list: https://docs.payermax.com/en/202506-version/acquiring/payment-methods.md
- Subscription payment methods: https://docs.payermax.com/en/202506-version/acquiring/subscription.md

Wait for user selection. Set `payment_method_type` accordingly.

### Specify APM payment methods (if APM selected)

**Skip if:** 
- User already named specific APM methods (e.g., "TNG", "DANA", "KakaoPay") or specific countries (e.g., "Malaysia", "Indonesia", "马来西亚") in the original prompt → use those directly, skip this step.
- Integration Mode = `cashier-full_payment_method` or `pay_by_link` → skip (both show all payment methods automatically).

**Only ask this if the user selected APM in the previous step AND did not already specify which APMs or countries.**

**Stop and ask:**

> Which APM payment methods would you like to integrate?
>
> You can specify either:
> - **Payment method names** (e.g., DANA, KakaoPay, GCash) — will integrate those specific methods
> - **Country/region names** (e.g., Indonesia, Korea) — will integrate ALL available APM methods for that country
>
> | Country | Available APMs |
> | --- | --- |
> | Indonesia | DANA, OVO, GoPay, ShopeePay |
> | Malaysia | TNG (Touch 'n Go), Boost, GrabPay |
> | Thailand | TrueMoney, PromptPay |
> | Philippines | GCash, Maya |
> | Vietnam | MoMo, ZaloPay, VNPay |
> | Korea | KakaoPay, NaverPay, Toss |
> | Brazil | MercadoPago, PIX |
> | Other | See full list in docs below |
>
> Full payment method list: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/payment-method-list/standard-acquiring-products.html
> Supported countries & currencies: https://docs.payermax.com/en/202606-version/acquiring/payment-method-capabilities/supported-countries-currencies-and-languages.html
>
> Please specify payment method names or countries:

Wait for user response. If the user provides country names, expand to all APM methods available for those countries. Record in the scenario profile as `country` and `target_org` fields accordingly.

### Open questions (optional, context-dependent)

After completing the steps above, review the gathered information and present 2–4 open-ended questions that would materially improve the implementation. Only ask questions whose answers would change the code or architecture.

**Stop and ask:**

> Before I proceed to generate the integration solution, here are a few questions that would help me tailor the implementation to your needs (all optional — feel free to skip any):
>
> [Generate 2–4 questions based on the actual scenario from the question bank below.]

**Question bank (select based on context — do NOT use all):**

| Condition | Possible question |
| --- | --- |
| Any product | Do you need refund support? If yes, should it support partial refunds?  |
| Any product | Do you have an existing order/payment system that this integration needs to connect to?  |
| Subscription | Do you need trial periods or promotional pricing for new subscribers?  |
| Subscription (pmx_manage) | What should happen when a periodic deduction fails — terminate the plan or keep it active?  |
| Subscription (merchant_manage / auto_debit) | What triggers a subsequent deduction in your business logic? (e.g., billing cycle, usage threshold, manual action)  |
| tokenization_enabled = true | Should users be able to save multiple cards, or replace the existing one each time?  |
| drop_in | Do you need to customize the payment component's appearance (colors, fonts, locale)?  |
| Card selected | Do you need to restrict card brands (e.g., Visa/Mastercard only)?  |
| APM selected | Are there specific APM wallets/methods you want to prioritize or exclude?  |
| Multi-terminal | Which terminals do you need to support: web, H5 (mobile browser), native app, or all?  |
| Any product | Do you need to handle payment disputes/chargebacks (receive notifications, query cases, submit evidence)?  |

**Rules:**
- Select 2–4 questions maximum — do not overwhelm the user
- Only ask questions whose answers would materially change the implementation
- If the project context already provides clear answers (e.g., language/framework is obvious from code), skip those questions
- Mark all questions as optional — the user can skip any or all
- After receiving answers (or if user skips), proceed to Phase 2 (solution document generation)

### Recommendation logic

Use these signals to generate default recommendations:

| Signal | Recommendation |
| --- | --- |
| Project has `subscription`/`recurring`/`billing cycle` code or config | Product = Subscription |
| Project is e-commerce / one-time purchase | Product = Standard Acquiring |
| Project has no frontend code or minimal frontend | Integration Mode = cashier-full_payment_method |
| Project has custom checkout page / React/Vue payment form | Integration Mode = drop_in |
| Project has custom checkout page with card form / 3DS handling / full payment control | Integration Mode = direct_api |
| Target market is Southeast Asia (ID, MY, TH, PH, VN) | Payment Method = Card + APM |
| Target market is Korea | Payment Method = Card + APM (KakaoPay/NaverPay) |
| Target market is Global / US / EU | Payment Method = Card |
| Project mentions offline/QR/sharing scenarios | Integration Mode = pay_by_link |
| `tokenization_enabled: true` | Exclude `cashier-full_payment_method` and `pay_by_link`; prefer `drop_in` (no PCI, best UX) > `cashier-specified_payment_method` > `direct_api` |
| Cannot determine from project context | Use most common: Standard Acquiring / cashier-full_payment_method / Card |

### Route to variant

After all 5 steps are complete, use the router (`references/router.md`) to normalize the scenario profile. Then select the variant:

| Payment Product | Scenario | Integration Mode | Variant file |
| --- | --- | --- | --- |
| Standard Acquiring | default | cashier-full_payment_method | `references/variants/full-payment-method.md` |
| Standard Acquiring | default | cashier-specified_payment_method | `references/variants/specified-payment-method.md` |
| Standard Acquiring | default | drop_in | `references/variants/drop-in.md` |
| Standard Acquiring | default | pay_by_link | `references/variants/paybylink.md` |
| Standard Acquiring | default | direct_api | `references/variants/direct-api.md` |
| Standard Acquiring | tokenization | cashier-specified / direct_api / drop_in | See the tokenization table in `references/router.md` |
| Subscription | pmx_manage_plan | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/pmx-manage.md` |
| Subscription | merchant_manage_plan | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/merchant-manage.md` |
| Subscription | non_periodic_auto_debit | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/auto-debit.md` |

**Constraint:** When `payment_method_type = APM`, `drop_in` is not available — route to `cashier-full_payment_method`, `cashier-specified_payment_method`, `pay_by_link`, or `direct_api`.

## Phase 2: Generate solution document

Produce `payermax_integration_solution.md` containing:

1. business understanding
2. recommended integration scenario + normalized `scenario_profile`
3. required API list
4. required capabilities
5. open questions
6. recommended next step

Use template: `references/output/payermax-integration-solution-template.md`

**Hard gate:** after outputting the solution, **stop and ask for confirmation**. Do not generate code until the user explicitly confirms.

**MCP early-auth (optional):** At this confirmation gate, if the `payermax-developer` MCP server is connected but not yet authenticated, include in your confirmation prompt:

> The PayerMax MCP Server has been detected as connected. May I proceed with authorizing the sandbox account? Upon authorization, the actual credentials (including merchantNo and key pairs) will be automatically populated during code generation.
> - **Authorization** — Sign in if required. Sandbox authorization completes automatically; no code entry or confirmation click is required.
> - **Skip** — Handle it later when generating code

If the user chooses to authorize:
1. If valid credentials already exist, continue directly to the MCP-first configuration workflow without starting another login.
2. Otherwise, call `authenticate` and explain that the browser should open automatically.
3. Ask the user only to sign in if required; sandbox authorization completes automatically after sign-in.
4. Do not display, request, or compare a verification code or device code.
5. Present the complete verification URL returned by MCP only when automatic browser opening fails.
6. Call `check_auth_status` until authentication succeeds or the authorization link expires, then continue the MCP-first configuration workflow.

If the user skips or MCP is not connected, proceed normally — Phase 3 will handle via its existing MCP-first/fallback logic.

## Phase 3: Implementation (after confirmation only)

After explicit user confirmation, read the selected variant file, then follow the rules and output contract below.

### Mandatory deliverables checklist

After implementation, the following deliverables MUST all be generated. Do NOT consider the task complete until every item is produced.

| # | Deliverable | Description |
| --- | --- | --- |
| 1 | **Configuration file** | Primary config with ALL PayerMax keys (appId, merchantNo, merchant-private-key, merchant-public-key, payermax-public-key, base-url, notify-url, version, key-version) |
| 2 | **Core integration code** | Payment creation, callback handler, query fallback, refund (per minimum story section below) |
| 3 | **Request signing utility** | SHA256WithRSA sign + verify implementation |
| 4 | **Connectivity tests** | One runnable test per outbound API path; reads credentials from config file (not hardcoded) |
| 5 | **Run instructions** | How to configure credentials, run connectivity tests, and start the application |
| 6 | **Setup Guide** | Configuration, testing, and go-live guide based on `references/output/setup-guide-template.md` |

**Hard rule:** If any of items 1–4 is missing from your output, you have NOT completed the implementation. Go back and generate the missing item before presenting the result to the user.

#### Configuration file format by tech stack

Detect the project's tech stack and generate the config file in the appropriate format:

| Tech Stack | Config file | Format |
| --- | --- | --- |
| Spring Boot (Java/Kotlin) | `application.yml` or `application.properties` | YAML or properties |
| Node.js (Express/Nest/Koa) | `.env` + `config.ts` or `config.js` | dotenv + JS/TS object |
| Python (Flask/Django/FastAPI) | `.env` + `config.py` or `settings.py` | dotenv + Python dict |
| Go (Gin/Echo) | `config.yaml` or `.env` | YAML or dotenv |
| PHP (Laravel) | `.env` | dotenv |

Regardless of format, ALL of the following keys must be present:

| Key (canonical name) | Purpose |
| --- | --- |
| `app-id` / `APP_ID` | PayerMax application ID |
| `merchant-no` / `MERCHANT_NO` | Merchant number |
| `merchant-private-key` / `MERCHANT_PRIVATE_KEY` | Merchant RSA private key (single-line Base64) |
| `merchant-public-key` / `MERCHANT_PUBLIC_KEY` | Merchant RSA public key (single-line Base64) |
| `payermax-public-key` / `PAYERMAX_PUBLIC_KEY` | PayerMax RSA public key for callback verification |
| `base-url` / `BASE_URL` | API base URL (sandbox: `https://pay-gate-uat.payermax.com`, production: `https://pay-gate.payermax.com`) |
| `notify-url` / `NOTIFY_URL` | Callback notification URL |
| `version` / `VERSION` | API version (from API docs, e.g. `"1.5"`) |
| `key-version` / `KEY_VERSION` | Key version (from API docs, e.g. `"1"`) |

**Hard rule:** Do NOT skip generating the configuration file. Do NOT assume the developer will create it manually. Generate it with all keys above, using inline comments explaining how to obtain each value.

### Rules

#### Mandatory: explore existing project before writing code

Before generating any code files, you MUST:

1. **Check for existing entry point** — Find all classes annotated with `@SpringBootApplication` (Java), `main` files (Go/Node), or equivalent entry points. Do NOT create a new one if one already exists.
2. **Check for existing config files** — Find any `application.yml`, `application.properties`, `.env`, or equivalent. If one exists, APPEND PayerMax config to it rather than creating a new file that conflicts.
3. **Check for existing packages/modules** — Identify existing package structure and naming conventions. Place new files in the correct package hierarchy matching the project's style.
4. **Check for existing dependencies** — Read `pom.xml` / `package.json` / `go.mod` etc. Do NOT add dependencies that are already inherited (e.g., `jackson-databind` from `spring-boot-starter-web`).

**Hard rule:** If you skip this step and create a conflicting file (duplicate entry point, duplicate config), the implementation is broken. Always explore first.

#### Mandatory: read shared reference files when applicable

When the scenario involves specific integration modes, you MUST read the corresponding shared reference files BEFORE generating code:

| Condition | Must read | Contains |
| --- | --- | --- |
| `integration_mode == drop_in` | `references/shared/drop-in-frontend.md` | CDN URL, SDK initialization pattern (`PMdropin.create`), payment flow, API version requirements, test panel template |
| `tokenization_enabled == true` | `references/shared/tokenization.md` | Token Inquiry、Payment Using PaymentTokenID、Unbinding PaymentTokenID |
| `+ integration_mode == drop_in` | Also add `references/shared/drop-in-frontend.md` | Component Lifecycle、`agreementAccepted`、`create3DSPopup` |
| User confirmed dispute/chargeback capability | `references/shared/dispute.md` | Chargeback notification, case query, case response |

**Hard rule:** without `drop-in-frontend.md`, drop-in frontend code is unreliable; without `tokenization.md`, the token endpoints, second-payment request, and ownership checks are guesswork. Read the applicable file(s) first.

#### Mandatory: fetch docs before writing code

Before writing any implementation code, you MUST follow the selected variant file's "Fetch docs before writing code" section:

1. **Execute Step 1** — Fetch all integration docs listed in the variant file's Step 1 table
2. **Execute Step 2** — Fetch all API docs listed in the variant file's Step 2 list

This rule applies to ALL scenarios (standard acquiring AND subscription). The variant file is the sole authoritative source for fetch URLs. Do NOT use any other URL source.

**Verification:** After fetching, confirm in your reasoning that you have read the doc for each required API before proceeding to code generation. If a fetch fails, retry once; if it still fails, inform the user and do not guess the API contract.

#### Critical implementation pitfalls

1. **Never treat `APPLY_SUCCESS` as payment success** — it means API request accepted. Actual state comes from callback `data.status` or `/orderQuery`.
2. **Never fulfill on front callback alone** — `frontCallbackUrl` is browser return only.
3. **Callback handler must be idempotent** — up to 6 retries (`0s/30s/300s/600s/3600s/43200s`). Process: verify sign → validate → dedupe → state update → ack.
4. **Callback ack format is exact** — Payment: `{"msg":"Success","code":"SUCCESS"}`. Refund: `{"code":"SUCCESS","msg":"Success"}`.
5. **`merchantNo` is required in practice** — always send it.
6. **`version`/`keyVersion` must come from fetched API doc** — read the `version` field description in each API doc's Request Body table (e.g., "当前值为：1.5" means use `"1.5"`). Do NOT hardcode from memory or assume any default value. Each API endpoint may have a different version requirement.
   A single tokenization integration legitimately mixes versions across endpoints — always take the value from the doc you fetched for that specific endpoint.
7. **`expireTime` ≥ 1800** — system enforces this minimum.
8. **Always keep `/orderQuery` as fallback** — for delayed callbacks, signature doubt, reconciliation.
9. **Refund state is separate** — model `REFUND_SUCCESS`/`REFUND_PENDING`/`REFUND_FAILED` independently. Idempotency anchor: `outRefundNo`.
10. **Sign the exact request body bytes** — signature in `sign` header. Verify inbound callbacks before business logic.
11. **Refund result also requires dual-channel** — callback (`refundResultNotifyUrl`) + query (`/refundQuery`) as fallback, same pattern as payment result.
12. **Never trust a client-supplied `paymentTokenID` or `userId`** — derive `userId` from the server session, and verify token ownership before every token payment. Accepting either from the browser is an IDOR vulnerability that lets one user charge another user's card.
13. **`frontCallbackUrl` must be domain-whitelisted** — the frontend commonly sends `window.location.href`. Validate against an allowlist server-side before forwarding.

#### Per-endpoint persistence

| Path | Persist from response |
| --- | --- |
| `/orderAndPay` | `redirectUrl`, `outTradeNo`, `tradeToken`, `status` |
| `/orderQuery` | `data.status` |
| `/refund` | `outRefundNo`, `tradeOrderNo`, `refundTradeNo`, `status` |
| `/refundQuery` | `data.status` |

#### Status mapping

| Signal | Meaning |
| --- | --- |
| `APPLY_SUCCESS` | Create accepted, not paid |
| `PENDING` | Wait / poll |
| `SUCCESS` | Paid — fulfill |
| `FAILED` / `CLOSED` | Do not fulfill |

#### Subscription-specific status mapping

| Subscription Plan Status | Meaning |
| --- | --- |
| `INACTIVE` | Plan created, not yet activated |
| `ACTIVE` | Plan activated, deductions running |
| `ACTIVE_FAILED` | Activation failed |
| `TERMINATE` | Terminated due to payment failure |
| `CANCEL` | Merchant/user cancelled |
| `FINISH` | All periods completed |
| `EXPIRED` | Not activated within 24h |

| Subscription Deduction Status | Meaning |
| --- | --- |
| `PENDING` | Debit in progress |
| `SUCCESS` | Debit successful — fulfill for this period |
| `FAILED` | Debit failed after all retries |

### Minimum story (backend)

**Rule:** The frontend never calls PayerMax directly — every call goes through a merchant endpoint holding the signing key (contract: `references/shared/tokenization.md`).

- `/orderAndPay` — create payment
- Callback handler for `notifyUrl`
- `/orderQuery` — fallback query
- `/refund` + `/refundQuery` — refund support

For drop-in, also include `/applyDropinSession` and frontend JS code.

For tokenization (any integration mode), also include:
- `/inquirePaymentToken`, `/removePaymentToken`
- `/orderAndPay` with `tokenForFutureUse: true` (first payment) / with `paymentTokenID` (second payment)

For pay_by_link, also include:
- `/createPaybylink` — create payment link
- `/queryPaybylink` — query link status
- `/expirePaybylink` — expire payment link
- Callback handler for `payLinkResultNotifyUrl` (payment result notification)

For direct_api, also handle:
- redirectUrl processing (redirect user to payment channel for authentication)
- 3DS authentication flow (if Card)
- Google Pay / Apple Pay client-side token passing (if applicable)

For subscription (PMX manage), also include:
- `/subscriptionCreate` — create subscription plan
- `/orderAndPay` — activate subscription (first payment)
- Callback handler for `subscriptionPaymentResultNotifyUrl` (per-period deduction)
- Callback handler for `subscriptionResultNotifyUrl` (plan status change)
- `/subscriptionQuery` — query plan status
- `/subscriptionCancel` — cancel plan

For subscription (merchant manage / auto debit), also include:
- `/orderAndPay` with `tokenForFutureUse: true` — initial bind
- `/orderAndPay` with `paymentTokenID` + `merchantInitiated: true` — subsequent debit
- `/removePaymentToken` — unbind payment method (token removal)
- Callback handler for `collectResultNotifyUrl`
- `/orderQuery` — fallback query

If dispute/chargeback capability requested, also include:
- Callback handler for `chargeBaclNotifyUrl` (chargeback notification)
- `/caseSearch` — query dispute case details
- `/caseReplay` — respond to dispute (accept or challenge)

### Connectivity tests (MANDATORY — do not skip)

**Hard rule:** You MUST generate connectivity test code. This is NOT optional. If you do not generate tests, the implementation is incomplete.

Generate **one runnable test per outbound API path**. Each test must follow this structure:

1. **Load config** — read credentials from the project's primary config file (same mechanism as production code)
2. **Build request** — construct a minimal valid request body per API docs
3. **Sign request** — use the signing utility to sign the request body
4. **Send request** — call the PayerMax sandbox endpoint
5. **Assert response** — verify HTTP 200 and `code` field is present (sandbox may reject test data, but connectivity is confirmed if response is received)
6. **Print result** — output pass/fail with response code and message

Required test paths (based on product):
- Standard Acquiring: `/orderAndPay`, `/orderQuery`, `/refund`, `/refundQuery`
- Direct API: `/orderAndPay`, `/orderQuery`, `/refund`, `/refundQuery`
- PayByLink: `/createPaybylink`, `/queryPaybylink`, `/expirePaybylink`, `/orderQuery`, `/refund`, `/refundQuery`
- Drop-In: add `/applyDropinSession`
- Tokenization (any mode): add `/inquirePaymentToken`, `/removePaymentToken`
- Tokenization + Drop-In: add `/applyDropinSession`, `/inquirePaymentToken`, `/removePaymentToken`
- Subscription (PMX manage): add `/subscriptionCreate`, `/subscriptionQuery`, `/subscriptionCancel`
- Subscription (merchant/auto-debit): same as Standard Acquiring (`/orderAndPay`, `/orderQuery`)
- Dispute (if requested): `/caseSearch`, `/caseReplay`

Each test file must include:
- A comment block at the top explaining how to run it (e.g., `mvn test`, `pytest`, `npm test`)
- Pass/fail criteria
- Common failure hints (wrong key, network timeout, signature mismatch)

**Hard rules for tests:**
- Tests MUST read credentials from the config file — never hardcode `"YOUR_APP_ID"` or similar placeholders
- Tests MUST use the same signing utility as production code
- Tests MUST be runnable without modification after filling config credentials

### Output shape

#### Config file — Credentials and keys

**Strategy: MCP-first, fallback to manual.**

**Step 1: Check if PayerMax MCP Server is available**

Check if the `payermax-developer` MCP server is connected and accessible. If available, use it to automatically obtain all credentials. If not available, fall back to manual configuration instructions.

**Step 2 (MCP available): Auto-configure via MCP Server**

1. Call `get_sandbox_config` tool to obtain sandbox integration configuration:
   - merchantNo, appId
   - merchantPublicKey (already uploaded to platform)
   - payermaxPublicKey
   - notifyUrl, frameworkVersion

2. **Keypair handling (conditional — do NOT overwrite existing keys):**
   - Search the project for existing config files (e.g. `application.yml`, `application.properties`, `.env`, `config.ts/js`) that contain a non-empty `merchant-private-key` or `MERCHANT_PRIVATE_KEY` value (not a placeholder, not a TODO comment, not an empty string).
   - **If a valid private key already exists:** Do NOT call `sandbox_generate_keypair`. Reuse the existing private key and public key values from the config file. Log to the user: "Existing merchant keypair found — reusing without regeneration."
   - **If no valid private key exists (empty, placeholder, or not found):** Call `sandbox_generate_keypair` tool to generate a new RSA key pair:
     - Returns merchantPublicKey + merchantPrivateKey (private key returned once only, not saved server-side)
     - Public key is automatically uploaded to PayerMax platform
   
   ⚠️ NEVER overwrite an existing valid merchant private key unless the user explicitly requests regeneration (e.g. "regenerate my keypair", "create a new keypair", "generate new keys").

3. Fill ALL configuration values from the above responses directly into the config file. No placeholders, no TODOs for credentials.

4. If `notifyUrl` needs to be set/updated, call `sandbox_configure_notify_url` with the project callback endpoint URL.

5. If specific payment methods need to be enabled (based on the scenario profile), call `sandbox_update_payment_methods` to activate them.

**Step 3 (MCP NOT available): Manual fallback**

If the `payermax-developer` MCP server is not connected:

1. Leave `merchant-private-key`, `merchant-public-key`, `payermax-public-key`, `app-id`, `merchant-no` as empty strings with the comment:
   ```
   # TODO: Configure merchant credentials using ONE of these methods:
   #
   # Option A (Recommended): Install the PayerMax MCP Server:
   #   npx -y payermax-developer-mcp-server@latest
   #   Then ask your AI agent to run: sandbox_generate_keypair
   #
   # Option B: Generate keypair locally and upload public key:
   #   Generate RSA 2048-bit keypair, fill private key below,
   #   then upload public key via developer.payermax.com or sandbox_upload_merchant_public_key
   #
   # Option C: Manually obtain from PayerMax Developer Center:
   #   https://developer.payermax.com
   ```

2. Do NOT attempt local keypair generation via openssl (deprecated — unreliable across environments).

**Step 4 (MCP available): Post-acceptance diagnostics**

After triggering acceptance tests via `sandbox_trigger_acceptance`, if tests fail:

1. Use `sandbox_query_orders` (type: "trade" or "pay") to check order status.
2. Use `sandbox_resend_notification` if the webhook notification was not received.
3. Use `sandbox_dispute_create` if acceptance requires dispute/chargeback testing.
4. Use `sandbox_subscription_mock_period` if acceptance requires subscription billing cycle testing.

**Hard rules:**
- If MCP is available, ALWAYS use it — do not generate keys locally
- If MCP is available, the config file must be fully filled (zero placeholders)
- If MCP is NOT available, do NOT attempt openssl generation — point to MCP Server installation instead


#### Key format specification

PayerMax requires:
- Algorithm: RSA
- Key format: PKCS#8
- Signature algorithm: SHA256WithRSA
- Key length: 2048 bits

Valid key string characteristics:
- Private key: single-line Base64, no PEM headers/footers, no whitespace, typically ~1700 characters
- Public key: single-line Base64, no PEM headers/footers, no whitespace, typically ~390 characters
- Both must be decodable as valid DER-encoded keys
- The keypair must be mathematically matched (sign with private → verify with public)

Key format reference: https://docs.payermax.com/en/202506-version/developer/config-settings.md

#### Mandatory inline code comments (paste verbatim)

Complete the configuration file:
- If MCP Server was used to fill values: add a single comment at the top of the PayerMax config block:
  ```
  # PayerMax sandbox credentials (auto-configured via MCP Server)
  # To regenerate keypair: ask your AI agent to run sandbox_generate_keypair
  # To reconfigure: ask your AI agent to run get_sandbox_config
  ```
- If fallback (MCP not available): attach the credential TODO comment block from "Step 3 (MCP NOT available)" above to the empty `appId` / `merchantNo` / `payermax-public-key` / `merchant-public-key` / `merchant-private-key` fields.

#### Pre-call request validation (mandatory)

Every outbound PayerMax API call must have a validation layer:
1. Required-field null check (throw clear error, not NPE)
2. Type/constraint check (string length, numeric range, enum, date format)
3. Fail fast — block the API call on validation failure

#### Pre-test configuration and go-live steps

Both belong to the generated Setup Guide (`references/output/setup-guide-template.md`). If MCP filled the config, say so and run the tests directly.

#### Do not

- Do not claim a field is required unless docs establish it
- Do not mark payment successful on front callback alone
- Do not invent CDN URLs, SDK parameters, or field names from memory
- Do not hardcode placeholders in test classes
- Do not use `api.payermax.com` — this domain does not exist. The correct API base URL is `pay-gate-uat.payermax.com` (sandbox) / `pay-gate.payermax.com` (production)

### Generate Setup Guide

After all code is generated, produce a `SETUP_GUIDE.md` file based on `references/output/setup-guide-template.md`. Fill all `{placeholder}` sections with actual values from the implementation. Only include sections relevant to the selected product, integration mode, and payment methods. Remove HTML comments and conditional markers — output a clean, ready-to-use guide.

### Post-code key configuration guidance

After code generation is complete, if merchant private key is not yet configured (MCP was not used, or MCP is available but keypair was not yet generated), present the following guidance to the user:

> ✅ Code generation complete! Next step: configure the merchant keypair. Please choose one option:
>
> **Option 1️⃣: Auto-generate keypair (Recommended)**
> I'll call `sandbox_generate_keypair` to generate an RSA keypair for you. The public key is automatically uploaded to PayerMax, and the private key is written to your config file.
>
> **Option 2️⃣: Use an existing keypair**
> If you already have an RSA 2048-bit keypair, paste the private key into the config file, then I'll call `sandbox_upload_merchant_public_key` to upload your public key.
>
> **Option 3️⃣: Manual setup via Developer Center**
> Sign in to [developer.payermax.com](https://developer.payermax.com), go to Settings → Developer Info → Key Management, and upload your public key.
>
> Please choose: **1** / **2** / **3**

**Rules:**
- If MCP is available and `sandbox_generate_keypair` was already called during Step 2, skip this prompt (config is complete)
- If project already has a non-empty merchant-private-key in config, skip this prompt (keypair already configured)
- If user selects 1: call `sandbox_generate_keypair`, write private key to config file, confirm completion
- If user selects 2: ask user to paste their public key, then call `sandbox_upload_merchant_public_key`
- If user selects 3: skip — user will handle manually

### Self-check before presenting result

Before presenting the implementation to the user, verify against the deliverables checklist:

- [ ] Configuration file generated with ALL required keys (appId, merchantNo, private key, public key, payermax public key, base URL, notify URL, version, key version)?
- [ ] Core integration code generated (payment creation + callback handler + query fallback + refund)?
- [ ] Request signing utility generated (sign outbound + verify inbound)?
- [ ] Connectivity tests generated (one per outbound API path, reads from config)?
- [ ] All code reads credentials from config file (no hardcoded placeholders)?
- [ ] Base URL uses `pay-gate-uat.payermax.com` (sandbox) or `pay-gate.payermax.com` (production) — NOT `api.payermax.com`?
- [ ] Run instructions provided (how to configure, test, and start)?
- [ ] Setup Guide generated (`SETUP_GUIDE.md` with configuration steps, test instructions, production checklist)?
- [ ] If dispute capability requested: chargeback notification handler + `/caseSearch` + `/caseReplay` implemented?
- [ ] If tokenization: `/inquirePaymentToken` + `/removePaymentToken`, saved-card list with remove + confirmation, empty-list fallback, ownership check?
- [ ] If drop_in: 3DS via `create3DSPopup` (not `window.open`), `frontCallbackUrl` allowlisted?

**If any item is unchecked, generate it now before responding to the user.**

## Phase 4: Code review (no solution gate)

When reviewing existing code, check:
- signing, callback verification, idempotency
- status source (not redirect/create alone)
- query fallback, refund-state handling
- variant-specific fields

Fetch official API Markdown only for lines explicitly flagged as `verify-in-openapi` — and only if the local reference files do not already contain the needed information.

## Ground rules

- Solution-first, not code-first
- Ask the fewest questions possible
- Never skip the confirmation gate after generating the solution
- Prefer official API-facing field names (`merchantNo`, `paymentDetail.paymentMethodType`)
- If the profile is inconsistent with constraints, stop and explain

## References

| Path | Purpose |
| --- | --- |
| `references/router.md` | Scenario routing (validation rules, output format, examples) |
| `references/variants/*.md` | Branch-specific stance per integration mode (standard acquiring) |
| `references/variants/subscription/*.md` | Branch-specific stance per subscription scenario |
| `references/shared/drop-in-frontend.md` | Drop-In frontend SDK guide (shared across all scenarios) |
| `references/shared/tokenization.md` | Token query, second payment, unbinding (shared across all integration modes) |
| `references/shared/dispute.md` | Dispute/chargeback capability (optional, cross-scenario) |
| `references/output/` | Solution and summary templates |
| `shared-models/scenario-profile.yaml` | Canonical scenario profile schema |

## Online Official documentation (use `.md` URLs, not `.html`)

To obtain PayerMax's online documents using curl/web_fetch, use `.md` URLs (not `.html`).

```bash
curl -sL "{doc path}"
```

All fetch URLs are self-contained in each variant file's "Fetch docs before writing code" section. The following are reference-only links for general context (NOT used for code generation fetch):

| Topic | URL |
| --- | --- |
| Integration guide (envelope, signing, environment) | https://docs.payermax.com/en/202506-version/acquiring/integration-guide.md |
| Key pair configuration | https://docs.payermax.com/en/202506-version/developer/config-settings.md |
| Supported Countries, Currencies and Languages | https://docs.payermax.com/en/202506-version/appendix/collection/supported-country-region-currency.md |
| Test simulation rules | https://docs.payermax.com/en/202506-version/receipt/test-cases.md |
| Transaction Status & ErrorCode | https://docs.payermax.com/en/202506-version/appendix/collection/transaction-status.md |
| Issuer Response Code (CARD only) | https://docs.payermax.com/en/202506-version/appendix/collection/issuer-response-code.md |