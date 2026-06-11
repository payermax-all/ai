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
| Standard Acquiring | default | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in, paybylink, direct_api | orderAndPay, createPaybylink | `references/variants/full-payment-method.md` / `specified-payment-method.md` / `drop-in.md` / `paybylink.md` / `direct-api.md` |
| Standard Acquiring | default | APM | cashier-full_payment_method, cashier-specified_payment_method, paybylink, direct_api | orderAndPay, createPaybylink | `references/variants/full-payment-method.md` / `specified-payment-method.md` / `paybylink.md` / `direct-api.md` |
| Subscription | pmx_manage_plan | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | subscriptionCreate + orderAndPay | `references/variants/subscription/pmx-manage.md` |
| Subscription | pmx_manage_plan | APM | cashier-full_payment_method, cashier-specified_payment_method | subscriptionCreate + orderAndPay | `references/variants/subscription/pmx-manage.md` |
| Subscription | merchant_manage_plan | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | orderAndPay (bind + debit) | `references/variants/subscription/merchant-manage.md` |
| Subscription | merchant_manage_plan | APM | cashier-full_payment_method, cashier-specified_payment_method | orderAndPay (bind + debit) | `references/variants/subscription/merchant-manage.md` |
| Subscription | non_periodic_auto_debit | Card/ApplePay/GooglePay | cashier-full_payment_method, cashier-specified_payment_method, drop_in | orderAndPay (bind + debit) | `references/variants/subscription/auto-debit.md` |
| Subscription | non_periodic_auto_debit | APM | cashier-full_payment_method, cashier-specified_payment_method | orderAndPay (bind + debit) | `references/variants/subscription/auto-debit.md` |

**Constraint:** When Payment Method Type = APM, Integration Mode `drop_in` is not available.
**Constraint:** When Product = Subscription, Integration Mode `paybylink` is not available.
**Note:** Integration Mode `paybylink` and `direct_api` support all payment method types without restriction.

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
6. **Payment Methods for Full Cashier/PayByLink**: If integration mode = `cashier-full_payment_method` or `paybylink` → auto-select "All available payment methods", skip Step 4 and APM sub-step.

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
> Which payment product would you like to integrate? / 您希望集成哪个支付产品？
>
> | Product / 产品 | Description / 说明 | Best for / 适用场景 |
> | --- | --- | --- |
> | **Standard Acquiring（标准收单）** | One-time payment collection via checkout page or embedded components / 通过收银页面或嵌入式组件进行一次性收款 | E-commerce, digital goods, one-time purchases / 电商、数字商品、一次性购买 |
> | **Subscription（商家代扣）** | Recurring billing with automatic or merchant-initiated deductions / 自动或商户发起的周期性扣款 | SaaS, streaming, memberships, usage-based billing / SaaS、流媒体、会员、按量计费 |
>
> Product overview: https://docs.payermax.com/en/202506-version/acquiring/introduction/integration-mode.html
> Subscription overview: https://docs.payermax.com/en/202506-version/receipt/subscription/subscription-pmx-management.html
>
> Please select one / 请选择一项: **Standard Acquiring（标准收单）** / **Subscription（商家代扣）**

Wait for user selection. Then:
- Standard Acquiring → set `customer_product: acquiring_standard`, skip Step 2, proceed to Step 3
- Subscription → set `customer_product: receipt_subscription`, proceed to Step 2

### Which subscription scenario? (single select, Subscription only)

**Skip if:** Product = Standard Acquiring (always skip; scenario = `default`).

**Skip this step if product = Standard Acquiring** (Scenario = `default`).

**Stop and ask:**

> Based on your project, I recommend: **[recommended scenario]** (reason: ...).
>
> Which subscription scenario fits your business? / 哪种代扣场景适合您的业务？
>
> | Scenario / 场景 | Description / 说明 | Best for / 适用场景 |
> | --- | --- | --- |
> | **pmx_manage_plan（PayerMax管理订阅计划）** | PayerMax manages the full plan lifecycle: creation, activation, periodic auto-deduction, retry, notification / PayerMax 管理完整计划生命周期：创建、激活、周期自动扣款、重试、通知 | Standard SaaS/streaming with fixed billing cycles / 标准 SaaS/流媒体，固定计费周期 |
> | **merchant_manage_plan（商户管理订阅计划）** | Merchant controls billing timing; binds payment method first, then initiates each periodic debit via token / 商户控制扣款时机；先绑定支付方式，再通过 token 发起每次周期扣款 | Custom billing logic, variable amounts per period / 自定义计费逻辑，每期金额可变 |
> | **non_periodic_auto_debit（非周期性自动扣款）** | Merchant initiates on-demand debits using stored token; no fixed schedule / 商户使用存储的 token 按需发起扣款；无固定周期 | Usage-based billing, top-ups, pay-as-you-go / 按量计费、充值、按需付费 |
>
> Scenarios comparison: https://docs.payermax.com/en/202506-version/receipt/subscription/subscription-overview.html
>
> Please select one / 请选择一项: **pmx_manage_plan** / **merchant_manage_plan** / **non_periodic_auto_debit**

Wait for user selection. Then:
- `subscription_scenario: pmx_manage_plan`
- `subscription_scenario: merchant_manage_plan`
- `subscription_scenario: non_periodic_auto_debit`

### Build a payments page (single select)

**Skip if:** User explicitly states cashier, drop-in, paybylink, or direct API preference in their prompt (e.g., "收银台", "cashier", "前置组件", "drop-in", "embed component", "链接支付", "paybylink", "支付链接", "纯API", "direct API", "自建收银页"). Otherwise, must ask.

Analyze the project for frontend complexity signals (custom checkout page with card form / 3DS handling → direct_api; custom checkout page with embedded components → drop_in; no frontend / simple redirect → cashier; offline/sharing scenarios → paybylink).

**Stop and ask:**

> Based on your project, I recommend: **[recommended mode]** (reason: ...).
>
> Which Checkout Page Construction Method would you like to use? / 您希望使用哪种收银页构建方式？
>
> | Checkout Page Construction Method / 收银页构建方式 | Description / 说明 | Best for / 适用场景 |
> | --- | --- | --- |
> | **cashier-full_payment_method（全量收银台）** | PayerMax hosts the full payment page, displays all available payment methods / PayerMax 托管完整支付页面，展示所有可用支付方式 | Fastest integration; no frontend work; maximum payment method coverage / 最快集成；无需前端开发；支付方式覆盖最全 |
> | **cashier-specified_payment_method（指定支付方式）** | PayerMax hosts the payment page, but only shows payment methods you specify / PayerMax 托管支付页面，但仅展示您指定的支付方式 | When you want to control which methods are shown / 需要控制展示哪些支付方式时 |
> | **drop_in（前置组件）** | Embed PayerMax UI components (card form, Google Pay, Apple Pay) on your own page / 在您自己的页面嵌入 PayerMax UI 组件（卡表单、Google Pay、Apple Pay） | Custom UX without PCI-DSS; only supports Card/ApplePay/GooglePay (not APM) / 自定义体验且无需 PCI-DSS；仅支持 Card/ApplePay/GooglePay（不支持 APM） |
> | **paybylink（链接支付）** | Generate a payment link that users access via URL or QR code; PayerMax hosts the payment page / 生成支付链接，用户通过 URL 或二维码访问；PayerMax 托管支付页面 | Offline scenarios, social sharing, no redirect flow needed; supports all payment methods; Standard Acquiring only (not available for Subscription) / 线下场景、社交分享、无需重定向流程；支持所有支付方式；仅标准收单可用（订阅代扣不可用） |
> | **direct_api（纯API）** | Merchant builds their own checkout page; full control over UX; requires handling redirects and 3DS/wallet authentication / 商户自建收银页面；完全控制 UX；需处理重定向和 3DS/钱包认证 | Maximum customization; higher development cost / 最大化定制；开发成本较高 |
>
> Checkout Page Construction Method comparison: https://docs.payermax.com/en/202506-version/acquiring/introduction/integration-mode.html
> Drop-In component guide: https://docs.payermax.com/en/202506-version/acquiring/start-integration/create-payment/frontend-component.html
> Live demo (try each checkout experience): https://docs.payermax.com/payDemo/index.html
>
> Please select one / 请选择一项: **cashier-full_payment_method（全量收银台）** / **cashier-specified_payment_method（指定支付方式）** / **drop_in（前置组件）** / **paybylink（链接支付）** / **direct_api（纯API）**

Wait for user selection. Then set `integration_mode` accordingly:
- `cashier-full_payment_method` → `integration_mode: cashier`, `cashier_variant: full_payment_method`
- `cashier-specified_payment_method` → `integration_mode: cashier`, `cashier_variant: specified_payment_method`
- `drop_in` → `integration_mode: drop_in`
- `paybylink` → `integration_mode: paybylink`
- `direct_api` → `integration_mode: direct_api`

### Add payment methods

**Skip if:** 
- User explicitly names payment methods or APM brands in the prompt (e.g., "TNG", "DANA", "card", "Apple Pay", "信用卡") → auto-select the corresponding payment method types and skip this step.
- Integration Mode = `cashier-full_payment_method` or `paybylink` → auto-select "All available payment methods", skip this step and APM sub-step.

Analyze the project for target market signals (Southeast Asia → Card + APM; Global/US/EU → Card; etc.).

Available options depend on Step 3 selection:

**If Integration Mode = `drop_in`:**

**Stop and ask:**

> Based on your project's target market, I recommend: **[recommended methods]** (reason: ...).
>
> Which payment methods would you like to support? (select one or more) / 您希望支持哪些支付方式？（可多选）
>
> | Payment Method / 支付方式 | Description / 说明 | Supported Regions / 支持地区 |
> | --- | --- | --- |
> | **Card（银行卡）** | Visa, Mastercard, JCB, Discover, Diners Club | Global / 全球 |
> | **ApplePay** | Apple Pay (requires macOS 13+ / iOS 16+ for subscription) | Global / 全球 |
> | **GooglePay** | Google Pay (requires Android 8+ / Chrome 90+ for subscription) | Global / 全球 |
>
> ⚠️ Note: APM is not available in drop_in mode. / 注意：APM 在前置组件模式下不可用。
>
> Payment method list: https://docs.payermax.com/en/202506-version/acquiring/payment-methods.html
> Subscription payment methods: https://docs.payermax.com/en/202506-version/acquiring/subscription.html
> Supported countries & currencies: https://docs.payermax.com/en/202506-version/appendix/collection/supported-country-region-currency.html
>
> Please select one or more / 请选择一项或多项: **Card** / **ApplePay** / **GooglePay**

**If Integration Mode = `cashier-*`:**

**Stop and ask:**

> Based on your project's target market, I recommend: **[recommended methods]** (reason: ...).
>
> Which payment methods would you like to support? (select one or more) / 您希望支持哪些支付方式？（可多选）
>
> | Payment Method / 支付方式 | Description / 说明 | Supported Regions / 支持地区 |
> | --- | --- | --- |
> | **Card（银行卡）** | Visa, Mastercard, JCB, Discover, Diners Club | Global / 全球 |
> | **ApplePay** | Apple Pay (requires macOS 13+ / iOS 16+ for subscription) | Global / 全球 |
> | **GooglePay** | Google Pay (requires Android 8+ / Chrome 90+ for subscription) | Global / 全球 |
> | **APM（本地支付方式）** | Local payment methods: e-wallets (DANA, KakaoPay, NaverPay, TNG, etc.), bank transfer, etc. / 本地支付方式：电子钱包（DANA、KakaoPay、NaverPay、TNG 等）、银行转账等 | Region-specific / 特定地区 |
>
> Payment method list: https://docs.payermax.com/en/202506-version/acquiring/payment-methods.html
> Subscription payment methods: https://docs.payermax.com/en/202506-version/acquiring/subscription.html
> Supported countries & currencies: https://docs.payermax.com/en/202506-version/appendix/collection/supported-country-region-currency.html
>
> Please select one or more / 请选择一项或多项: **Card** / **ApplePay** / **GooglePay** / **APM**

Agent internal reference (for fetching content, use `.md` URLs):
- Payment method list: https://docs.payermax.com/en/202506-version/acquiring/payment-methods.md
- Subscription payment methods: https://docs.payermax.com/en/202506-version/acquiring/subscription.md

Wait for user selection. Set `payment_method_type` accordingly.

### Specify APM payment methods (if APM selected)

**Skip if:** 
- User already named specific APM methods (e.g., "TNG", "DANA", "KakaoPay") or specific countries (e.g., "Malaysia", "Indonesia", "马来西亚") in the original prompt → use those directly, skip this step.
- Integration Mode = `cashier-full_payment_method` or `paybylink` → skip (full cashier and paybylink show all payment methods automatically).

**Only ask this if the user selected APM in the previous step AND did not already specify which APMs or countries.**

**Stop and ask:**

> Which APM payment methods would you like to integrate? / 您希望集成哪些 APM 支付方式？
>
> You can specify either:
> - **Payment method names** (e.g., DANA, KakaoPay, GCash) — will integrate those specific methods
> - **Country/region names** (e.g., Indonesia, Korea) — will integrate ALL available APM methods for that country
>
> 您可以输入：
> - **支付方式名称**（如 DANA、KakaoPay、GCash）— 将集成指定的支付方式
> - **国家/地区名称**（如印尼、韩国）— 将集成该国家下所有可用的 APM 支付方式
>
> | Country / 国家 | Available APMs / 可用 APM |
> | --- | --- |
> | Indonesia / 印尼 | DANA, OVO, GoPay, ShopeePay |
> | Malaysia / 马来西亚 | TNG (Touch 'n Go), Boost, GrabPay |
> | Thailand / 泰国 | TrueMoney, PromptPay |
> | Philippines / 菲律宾 | GCash, Maya |
> | Vietnam / 越南 | MoMo, ZaloPay, VNPay |
> | Korea / 韩国 | KakaoPay, NaverPay, Toss |
> | Brazil / 巴西 | MercadoPago, PIX |
> | Other / 其他 | See full list in docs below |
>
> Full payment method list: https://docs.payermax.com/en/202506-version/acquiring/payment-methods.html
> Supported countries & currencies: https://docs.payermax.com/en/202506-version/appendix/collection/supported-country-region-currency.html
>
> Please specify payment method names or countries / 请输入支付方式名称或国家:

Wait for user response. If the user provides country names, expand to all APM methods available for those countries. Record in the scenario profile as `country` and `target_org` fields accordingly.

### Open questions (optional, context-dependent)

After completing the steps above, review the gathered information and present 2–4 open-ended questions that would materially improve the implementation. Only ask questions whose answers would change the code or architecture.

**Stop and ask:**

> Before I proceed to generate the integration solution, here are a few questions that would help me tailor the implementation to your needs (all optional — feel free to skip any):
> 在我生成集成方案之前，以下几个问题可以帮助我更好地定制实现（均为可选——可跳过任何问题）：
>
> [Generate 2–4 questions based on the actual scenario from the question bank below.]

**Question bank (select based on context — do NOT use all):**

| Condition | Possible question |
| --- | --- |
| Any product | Do you need refund support? If yes, should it support partial refunds? / 是否需要退款功能？如需要，是否支持部分退款？ |
| Any product | What is your expected transaction volume (daily/monthly)? This affects architecture recommendations. / 预期交易量是多少（日/月）？这会影响架构建议。 |
| Any product | Do you have an existing order/payment system that this integration needs to connect to? / 是否有现有的订单/支付系统需要对接？ |
| Any product | Which programming language and framework is your backend built with? / 后端使用什么编程语言和框架？ |
| Subscription | Do you need trial periods or promotional pricing for new subscribers? / 是否需要为新订阅用户提供试用期或优惠价格？ |
| Subscription (pmx_manage) | What should happen when a periodic deduction fails — terminate the plan or keep it active? / 周期扣款失败时应该怎么处理——终止计划还是保持活跃？ |
| Subscription (merchant_manage / auto_debit) | What triggers a subsequent deduction in your business logic? (e.g., billing cycle, usage threshold, manual action) / 什么触发后续扣款？（如计费周期、用量阈值、手动操作） |
| cashier-specified / drop_in | Do you need tokenization (save card for future payments)? / 是否需要 Token 化（保存卡信息用于后续支付）？ |
| drop_in | Do you need to customize the payment component's appearance (colors, fonts, locale)? / 是否需要自定义支付组件的外观（颜色、字体、语言）？ |
| Card selected | Do you need to restrict card brands (e.g., Visa/Mastercard only)? / 是否需要限制卡品牌（如仅 Visa/Mastercard）？ |
| APM selected | Are there specific APM wallets/methods you want to prioritize or exclude? / 是否有特定的 APM 钱包/方式需要优先或排除？ |
| Multi-terminal | Which terminals do you need to support: web, H5 (mobile browser), native app, or all? / 需要支持哪些终端：Web、H5（移动浏览器）、原生 App，还是全部？ |
| Any product | Do you need to handle payment disputes/chargebacks (receive notifications, query cases, submit evidence)? / 是否需要处理支付争议/拒付（接收通知、查询案件、提交证据）？ |

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
| Project mentions offline/QR/sharing scenarios | Integration Mode = paybylink |
| Cannot determine from project context | Use most common: Standard Acquiring / cashier-full_payment_method / Card |

### Route to variant

After all 4 steps are complete, use the router (`references/router.md`) to normalize the scenario profile. Then select the variant:

| Payment Product | Scenario | Integration Mode | Variant file |
| --- | --- | --- | --- |
| Standard Acquiring | default | cashier-full_payment_method | `references/variants/full-payment-method.md` |
| Standard Acquiring | default | cashier-specified_payment_method | `references/variants/specified-payment-method.md` |
| Standard Acquiring | default | drop_in | `references/variants/drop-in.md` |
| Standard Acquiring | default | paybylink | `references/variants/paybylink.md` |
| Standard Acquiring | default | direct_api | `references/variants/direct-api.md` |
| Standard Acquiring | default (tokenization) | cashier-specified_payment_method | `references/variants/tokenization.md` |
| Subscription | pmx_manage_plan | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/pmx-manage.md` |
| Subscription | merchant_manage_plan | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/merchant-manage.md` |
| Subscription | non_periodic_auto_debit | cashier-full_payment_method, cashier-specified_payment_method, drop_in | `references/variants/subscription/auto-debit.md` |

**Constraint:** When `payment_method_type = APM`, `drop_in` is not available — route to `cashier-full_payment_method`, `cashier-specified_payment_method`, `paybylink`, or `direct_api`.

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
| User confirmed dispute/chargeback capability | `references/shared/dispute.md` | Chargeback notification, case query, case response |

**Hard rule:** If `integration_mode == drop_in` and you did NOT read `references/shared/drop-in-frontend.md`, your frontend code is unreliable. Read it before generating ANY frontend or Drop-In related code.

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
7. **`expireTime` ≥ 1800** — system enforces this minimum.
8. **Always keep `/orderQuery` as fallback** — for delayed callbacks, signature doubt, reconciliation.
9. **Refund state is separate** — model `REFUND_SUCCESS`/`REFUND_PENDING`/`REFUND_FAILED` independently. Idempotency anchor: `outRefundNo`.
10. **Sign the exact request body bytes** — signature in `sign` header. Verify inbound callbacks before business logic.
11. **Refund result also requires dual-channel** — callback (`refundResultNotifyUrl`) + query (`/refundQuery`) as fallback, same pattern as payment result.

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

- `/orderAndPay` — create payment
- Callback handler for `notifyUrl`
- `/orderQuery` — fallback query
- `/refund` + `/refundQuery` — refund support

For drop-in, also include `/applyDropinSession` and frontend JS code.

For paybylink, also include:
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

#### Config file — Keypair generation

**Strategy: generate-and-verify, or leave empty.**

Attempt to generate a keypair using the following approach. If any step fails or the output does not pass validation, leave both key fields empty with a TODO comment.

**Step 1: Generate keypair and extract single-line Base64 strings**

```bash
# Generate PKCS#8 private key file
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out merchant_private.pem

# Derive public key file
openssl rsa -in merchant_private.pem -pubout -out merchant_public.pem

# Extract single-line Base64 (no header/footer/newlines)
PRIVATE_KEY=$(grep -v '^\-\-\-' merchant_private.pem | tr -d '\n')
PUBLIC_KEY=$(grep -v '^\-\-\-' merchant_public.pem | tr -d '\n')

echo "PRIVATE_KEY=$PRIVATE_KEY"
echo "PUBLIC_KEY=$PUBLIC_KEY"
```

**Step 2: Validate the extracted strings (mandatory — do not skip)**

After extraction, run these validation checks:

```bash
# Validate private key: must be valid Base64, decode to DER, and openssl can parse it
echo "$PRIVATE_KEY" | base64 -d | openssl pkey -inform DER -noout 2>/dev/null && echo "PRIVATE_KEY_VALID" || echo "PRIVATE_KEY_INVALID"

# Validate public key: must be valid Base64, decode to DER, and openssl can parse it
echo "$PUBLIC_KEY" | base64 -d | openssl pkey -inform DER -pubin -noout 2>/dev/null && echo "PUBLIC_KEY_VALID" || echo "PUBLIC_KEY_INVALID"

# Validate key pair match: sign with private, verify with public
echo "test" | openssl dgst -sha256 -sign merchant_private.pem -out /tmp/pmx_sig_test.bin
echo "test" | openssl dgst -sha256 -verify merchant_public.pem -signature /tmp/pmx_sig_test.bin && echo "KEYPAIR_MATCH" || echo "KEYPAIR_MISMATCH"
rm -f /tmp/pmx_sig_test.bin
```

**Step 3: Decision**

- If ALL THREE checks pass (`PRIVATE_KEY_VALID`, `PUBLIC_KEY_VALID`, `KEYPAIR_MATCH`): fill the `$PRIVATE_KEY` and `$PUBLIC_KEY` values into the config file, then delete the `.pem` files.
- If ANY check fails OR if `openssl` is not available: leave `merchant-private-key` and `merchant-public-key` as empty strings with the comment:
  ```
  # TODO: Generate keypair using one of these methods:
  #   1. Online: https://developer.payermax.com/devtool/generate
  #   2. SDK: Java/PHP SDK createKeyPair method
  #   3. OpenSSL: see https://docs.payermax.com/en/202506-version/developer/config-settings.md
  ```

**Hard rules:**
- Do NOT manually concatenate Base64 lines by reading file content character by character — use `grep -v | tr -d '\n'`
- Do NOT assume the key is valid without running the validation commands
- Do NOT fill a key value that failed validation into the config
- Always clean up `.pem` files after use (whether successful or not)

Set `payermax-public-key` to empty string — developer downloads it from the PayerMax Developer Center.

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
- For `appId`/`merchantNo`/payermax-public-key: `Obtain sandbox appId, merchantNo, and the PayerMax public key from the PayerMax Developer Center; see https://docs.payermax.com/en/202506-version/acquiring/integration-guide.md#_3-2-%E6%B3%A8%E5%86%8C%E6%88%90%E4%B8%BA%E5%BC%80%E5%8F%91%E8%80%85`
- For `merchant-public-key`/`merchant-private-key`: generate your key pair, and upload your public key in the PayerMax Developer Center; see https://docs.payermax.com/en/202506-version/acquiring/integration-guide.md#_3-4-1-%E9%85%8D%E7%BD%AE%E6%B5%8B%E8%AF%95%E7%8E%AF%E5%A2%83%E7%9A%84%E5%AF%86%E9%92%A5%E4%BF%A1%E6%81%AF`

#### Pre-call request validation (mandatory)

Every outbound PayerMax API call must have a validation layer:
1. Required-field null check (throw clear error, not NPE)
2. Type/constraint check (string length, numeric range, enum, date format)
3. Fail fast — block the API call on validation failure

#### Pre-test configuration block

> Before running connectivity tests, sign in to the PayerMax Developer Center (https://developer.payermax.com):
> 1. Configure test merchant number and appId
> 2. Upload merchant test public key
> 3. Download PayerMax test public key

#### Production go-live checklist

1. Fill production credentials in the primary config file
2. Ensure `notifyUrl` is reachable from overseas networks
3. Enable payment methods in the PayerMax Developer Center

#### Do not

- Do not claim a field is required unless docs establish it
- Do not mark payment successful on front callback alone
- Do not invent CDN URLs, SDK parameters, or field names from memory
- Do not hardcode placeholders in test classes
- Do not use `api.payermax.com` — this domain does not exist. The correct API base URL is `pay-gate-uat.payermax.com` (sandbox) / `pay-gate.payermax.com` (production)

### Generate Setup Guide

After all code is generated, produce a `SETUP_GUIDE.md` file based on `references/output/setup-guide-template.md`. Fill all `{placeholder}` sections with actual values from the implementation. Only include sections relevant to the selected product, integration mode, and payment methods. Remove HTML comments and conditional markers — output a clean, ready-to-use guide.

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
- Do not invent CDN URLs, SDK parameters, or field names from memory
- If the profile is inconsistent with constraints, stop and explain

## References

| Path | Purpose |
| --- | --- |
| `references/router.md` | Scenario routing (validation rules, output format, examples) |
| `references/variants/*.md` | Branch-specific stance per integration mode (standard acquiring) |
| `references/variants/subscription/*.md` | Branch-specific stance per subscription scenario |
| `references/shared/drop-in-frontend.md` | Drop-In frontend SDK guide (shared across all scenarios) |
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