# Drop-In Frontend SDK Integration

This file contains the frontend-only aspects of PayerMax Drop-In component integration. It is shared across all scenarios (standard acquiring AND subscription) because the frontend implementation is identical regardless of business scenario.

## Supported payment methods

Drop-In currently supports:

- `CARD` — card entry form (number, expiry, CVV)
- `GOOGLEPAY` — Google Pay button
- `APPLEPAY` — Apple Pay button

Specified via `componentList` in the `/applyDropinSession` request.

## Frontend flow

1. Load PayerMax Drop-In JS SDK via CDN:
   ```html
   <script src="https://cdn.payermax.com/dropin/js/pmdropin.min.js"></script>
   ```
   This is the **single official CDN URL** for both sandbox and production environments. Do not use `cdn-sandbox.payermax.com` or any other subdomain — the SDK detects the environment from the `sandbox` parameter passed to `PMdropin.create()`.
   Source: https://docs-v2.payermax.com/doc-center/acquiring/start-integration/create-payment/frontend-component.md
2. Call `PMdropin.create(type, { clientKey, sessionKey, sandbox, ... })` — **save the returned instance**
3. Call `instance.mount(selector)` to render into the merchant page
4. Listen to `instance.on('form-check', callback)` for form validity
5. On user submit: call `instance.emit('canMakePayment')` to get `paymentToken`
6. Send `paymentToken` to merchant backend for `/orderAndPay`

**Critical SDK usage pattern:** `PMdropin.create()` returns a component instance. All subsequent methods (`mount`, `on`, `emit`) must be called on **that instance**, not on the global `PMdropin` object. Example:

```js
// CORRECT — save instance, call methods on it
const cardInstance = PMdropin.create('card', {
  clientKey: clientKey,
  sessionKey: sessionKey,
  sandbox: true
});
cardInstance.mount('#card-container');
cardInstance.on('form-check', (res) => { /* ... */ });
cardInstance.emit('canMakePayment').then((res) => { /* ... */ });

// WRONG — mount/on/emit do NOT exist on the global PMdropin object
PMdropin.create('card', { ... });
PMdropin.mount('#card-container');  // TypeError: PMdropin.mount is not a function
```

## Multi-component rendering (when multiple payment methods selected)

When the user's `payment_method_type` includes **more than one** method (e.g., CARD + APPLEPAY + GOOGLEPAY), the frontend MUST implement a **payment method selector with per-method component containers**, rather than only mounting a single component type.

### Trigger condition

- `payment_method_type` array length > 1 AND `integration_mode == drop_in`

### Required implementation pattern

1. **Payment method tab/selector UI** — Render a tab bar or radio group listing all selected payment methods. Default to the first method (typically CARD).

2. **Per-method container** — Create a separate mount point (`<div>`) for each payment method:
   ```html
   <div id="card-container" class="dropin-container"></div>
   <div id="applepay-container" class="dropin-container" style="display:none;"></div>
   <div id="googlepay-container" class="dropin-container" style="display:none;"></div>
   ```

3. **Lazy initialization** — Each component is created and mounted only when the user first selects its tab (not all at page load). This avoids unnecessary SDK calls and improves performance.

4. **Shared session** — All components share the same `clientKey` and `sessionKey` from a single `/applyDropinSession` call. Do NOT call `/applyDropinSession` multiple times.

5. **Active instance tracking** — Maintain a variable (`activeMethod`) that tracks which component is currently visible. The "Pay" button must call `emit('canMakePayment')` on the **active** instance only.

6. **Show/hide logic** — On tab switch:
   - Hide all containers (`display:none`)
   - Show only the selected container (`display:block`)
   - Initialize the component if not yet created
   - Update pay button state

### Frontend code structure

```javascript
// Global state
let cardInstance = null;
let applepayInstance = null;
let googlepayInstance = null;
let activeMethod = 'card';
let dropinSessionData = null; // { clientKey, sessionKey }

function switchPaymentMethod(method) {
    activeMethod = method;
    // Update tab active state
    // Show/hide containers
    // Lazy-init component if needed: initComponentForMethod(method)
}

function initComponentForMethod(method) {
    if (method === 'card' && !cardInstance) {
        cardInstance = PMdropin.create('card', { clientKey, sessionKey, sandbox, ... });
        cardInstance.mount('#card-container');
        cardInstance.on('form-check', ...);
    }
    if (method === 'applepay' && !applepayInstance) {
        applepayInstance = PMdropin.create('applepay', { clientKey, sessionKey, sandbox });
        applepayInstance.mount('#applepay-container');
        applepayInstance.on('load', ...); // handle unsupported environment
        applepayInstance.on('payButtonClick', async () => {
            const result = await applepayInstance.emit('canMakePayment');
            // ... proceed with paymentToken
        });
    }
    if (method === 'googlepay' && !googlepayInstance) {
        googlepayInstance = PMdropin.create('googlepay', { clientKey, sessionKey, sandbox });
        googlepayInstance.mount('#googlepay-container');
        googlepayInstance.on('load', ...); // handle unsupported environment
        googlepayInstance.on('payButtonClick', async () => {
            const result = await googlepayInstance.emit('canMakePayment');
            // ... proceed with paymentToken
        });
    }
}

// Pay button handler — CARD ONLY
// Google Pay and Apple Pay are button-type components that trigger payment from their SDK-rendered button.
// The external "Pay" button should only be used for the Card component.
payButton.onclick = async () => {
    if (activeMethod !== 'card') return; // Wallet components use their own button
    const result = await cardInstance.emit('canMakePayment');
    // ... proceed with paymentToken
};
```

### Unsupported environment handling

Apple Pay and Google Pay components may fail to load in certain environments (wrong browser, no wallet configured, localhost). When the `load` event returns `code !== 'SUCCESS'`:

- Display a user-friendly message inside the container explaining why the method is unavailable
- Do NOT throw an error or block other payment methods
- The "Pay" button should remain disabled for that method only

### Single payment method case

When `payment_method_type` has exactly **one** entry, skip the tab selector entirely and mount only that single component — no tabs needed.

### Hard rule

If `integration_mode == drop_in` AND `payment_method_type` contains multiple entries, you MUST generate the multi-component tab pattern. Generating only a single component (e.g., card-only) when the user explicitly requested multiple methods is a **bug**.

## Wallet components: Google Pay / Apple Pay

Google Pay and Apple Pay are **button-type components** — their payment flow is triggered by the SDK's built-in button, not by an external "Pay" button controlled by the merchant.

### Event model difference from Card

| Component | Payment trigger | External "Pay" button |
|---|---|---|
| Card | Merchant calls `emit('canMakePayment')` on external button click | Required |
| Google Pay | SDK button click → `payButtonClick` event → merchant calls `emit('canMakePayment')` in the event handler | Must be HIDDEN when Google Pay tab is active |
| Apple Pay | SDK button click → `payButtonClick` event → merchant calls `emit('canMakePayment')` in the event handler | Must be HIDDEN when Apple Pay tab is active |

### Implementation pattern

```javascript
// For Google Pay / Apple Pay: listen to payButtonClick, then call canMakePayment
googlepayInstance.on('payButtonClick', async () => {
    const result = await googlepayInstance.emit('canMakePayment');
    // ... proceed with paymentToken
});
```

**Hard rule:** Do NOT call `emit('canMakePayment')` on Google Pay / Apple Pay from an external button click handler. The SDK will reject it. Always trigger from `payButtonClick` event.

### Subscription-specific: Google Pay canMakePayment parameters

When `customer_product == receipt_subscription` AND `payment_method_type` includes GOOGLEPAY, the `emit('canMakePayment')` call **MUST** include `subscriptionPlan` and `mitManagementUrl` parameters. Calling without these parameters will result in `MIT_PARAMS_VALIDATION_ERROR`.

**Card components do NOT need these parameters** — only Google Pay and Apple Pay in subscription mode.

```javascript
// Subscription mode: Google Pay canMakePayment with required parameters
googlepayInstance.on('payButtonClick', async () => {
    const result = await googlepayInstance.emit('canMakePayment', {
        subscriptionPlan: {
            planId: 'plan_xxx',           // subscription plan ID
            planName: 'Monthly Premium',   // plan display name
            billingCycle: 'MONTHLY',       // billing cycle
            amount: '9.99',               // amount per period
            currency: 'USD'               // currency
        },
        mitManagementUrl: 'https://merchant.com/manage-subscription' // merchant subscription management page URL
    });
    // ... proceed with paymentToken
});
```

**When to use:** Only when ALL of these conditions are true:
- `integration_mode == drop_in`
- `customer_product == receipt_subscription`
- `payment_method_type` includes `GOOGLEPAY` or `APPLEPAY`

**Source:** Fetch the Google Pay subscription doc for full parameter details:
`https://docs-v2.payermax.com/en/doc-center/receipt/subscription/googlepay/subscription-merchant-management.md`

## Fetch frontend API docs before generating frontend code

When generating Drop-In frontend code, you **must** use the official frontend API documentation for the relevant payment method(s) as the source of truth for:

- `PMdropin.create()` parameter names and types
- `PMdropin.mount()` usage
- `PMdropin.on()` event names and callback signatures
- `PMdropin.emit()` action names and response shapes

**Do not rely on memory or inference for frontend API parameters.** The JS SDK API surface is specific and does not follow generic patterns. For example:
- The `sandbox` parameter controls environment (not `environment`)
- There is no `environment` parameter on `PMdropin.create()`
- Parameter names like `hideSaveCard`, `hideCardBrands` are SDK-specific
- `mount()`, `on()`, `emit()` are instance methods on the object returned by `create()` — they do NOT exist on the global `PMdropin` object

| Payment method | Fetch this URL |
| --- | --- |
| CARD | `https://docs-v2.payermax.com/en/doc-center/receipt/front-end-component/configuration-card.md` |
| GOOGLEPAY | `https://docs-v2.payermax.com/en/doc-center/receipt/front-end-component/configuration-googlepay.md` |
| APPLEPAY | `https://docs-v2.payermax.com/en/doc-center/receipt/front-end-component/configuration-applepay.md` |
| Customization (styling, locale) | `https://docs-v2.payermax.com/en/doc-center/receipt/front-end-component/customization.md` |

If a fetch fails, mark the frontend code section as `verify-against-frontend-docs` and do not invent parameter names.

## Payment result handling (Drop-In specific)

Unlike cashier mode (where the user is redirected and result always comes via callback), Drop-In `/orderAndPay` may return the **final payment status synchronously** in the response.

### Synchronous result in `/orderAndPay` response

| `data.status` | Meaning | Action |
| --- | --- | --- |
| `SUCCESS` | Payment completed (common for card without 3DS) | Mark order as paid immediately; no need to wait for callback |
| `PENDING` | Payment still processing (3DS triggered, or async) | Wait for callback or poll `/orderQuery` |
| `FAILED` | Payment failed | Mark order as failed |
| `CLOSED` | Order closed | Mark order as closed |

### Implementation rules

**Backend:**

- After `/orderAndPay` returns `APPLY_SUCCESS`, **always check `data.status`** before deciding next action.
- If `data.status == SUCCESS`, update order state to paid immediately and return the status to the frontend.
- If `data.status == PENDING` and `data.redirectUrl` is present, return `redirectUrl` to frontend for 3DS.
- If `data.status == PENDING` and no `redirectUrl`, the payment is processing asynchronously — rely on callback + query fallback.
- Do not assume `APPLY_SUCCESS` means "pending" — it only means the API request was accepted.

**Frontend:**

- After receiving the backend response from the pay endpoint:
  1. If `data.status === 'SUCCESS'` → show payment success immediately.
  2. If `data.redirectUrl` is present → redirect for 3DS verification.
  3. If `data.status === 'FAILED'` or `'CLOSED'` → show failure.
  4. Otherwise (`PENDING` without redirect) → start polling for result.
- Do NOT unconditionally enter polling after a successful API response.

## Frontend test helper panel

When generating the frontend page, include a **test helper panel** inside the **payment section** (the section that contains the Drop-In card component). This panel is for sandbox testing only and should be visually distinct (e.g. dashed border, light background, labeled "🧪 Test Helper — sandbox only").

**Generation checklist for test helper panel:**

- [ ] Panel is inside the payment section (visible when card form is visible)
- [ ] Panel is NOT inside the order creation form
- [ ] Subject selector is present with all 4 options (SUCCESS, FAILED, PENDING, 3DS)
- [ ] Test card info is displayed adjacent to the card form for manual copy
- [ ] No attempt to programmatically fill iframe card fields
- [ ] Subject value flows end-to-end: frontend → create-order DTO → persist → /orderAndPay `data.subject`
- [ ] Backend does NOT hardcode `data.subject` when a user-provided value exists

### Test panel HTML template

**Include this template verbatim** inside the payment section (above the card container). Show it only when `sandbox: true`. The subject selector value must be passed to the backend as `data.subject` in the `/orderAndPay` request.

```html
<!-- 🧪 Test Helper — sandbox only -->
<div id="test-panel" style="border:2px dashed #f0ad4e; padding:16px; margin-bottom:16px; background:#fffdf5;">
  <h4>🧪 Test Helper (sandbox only)</h4>

  <!-- Subject Selector: controls payment result simulation -->
  <div style="margin-bottom:12px;">
    <label><strong>Payment Result Simulation (subject):</strong></label><br/>
    <select id="test-subject">
      <option value="SUCCESS" selected>SUCCESS — payment succeeds</option>
      <option value="FAILED">FAILED — payment fails</option>
      <option value="PENDING">PENDING — stays pending</option>
      <option value="3DS">3DS — triggers 3DS authentication (CARD only)</option>
    </select>
  </div>

  <!-- Test Card Selector: displays card details for manual copy -->
  <div style="margin-bottom:12px;">
    <label><strong>Test Card (copy values into card form manually):</strong></label><br/>
    <select id="test-card-select" onchange="displayTestCard()">
      <!-- Options are dynamically generated from TEST_CARDS data below -->
    </select>
    <div id="test-card-details" style="margin-top:8px; padding:8px; background:#f9f9f9; font-family:monospace; font-size:13px; display:none;">
      <div>Card: <span id="tc-number"></span></div>
      <div>Name: <span id="tc-name"></span></div>
      <div>Expiry: <span id="tc-expiry"></span></div>
      <div>CVV: <span id="tc-cvv"></span></div>
    </div>
  </div>

  <p style="font-size:12px; color:#888;">
    Apple Pay / Google Pay require sandbox accounts:
    <a href="https://developer.apple.com/cn/apple-pay/sandbox-testing/">Apple Pay sandbox</a> |
    <a href="https://groups.google.com/g/googlepay-test-mode-stub-data">Google Pay test cards</a>
  </p>
</div>
```

The corresponding JavaScript for `displayTestCard()`:

```javascript
/**
 * TEST_CARDS data: populate this from the official test card list at
 * https://docs-v2.payermax.com/doc-center/receipt/test-cases.md (section 2.2 Card)
 *
 * When generating this code, fetch the test-cases.md page and extract ALL card
 * entries from the "2.2 Card" section. Each table row becomes one entry below.
 * Do NOT hardcode only 3 cards — include every card brand listed in the official doc.
 */
const TEST_CARDS = [
  // Example structure — replace with ALL entries from official doc section 2.2:
  // { label: 'Visa', number: '4444333322221111', name: 'James Smith', expiry: '03/30', cvv: '123' },
  // { label: 'Mastercard', number: '5555555555554444', name: 'Allen Black', expiry: '11/26', cvv: '357' },
  // ... include ALL cards from https://docs-v2.payermax.com/doc-center/receipt/test-cases.md section 2.2
];

function initTestCardSelector() {
  const select = document.getElementById('test-card-select');
  select.innerHTML = '<option value="">— select a test card —</option>';
  TEST_CARDS.forEach((card, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = card.label + ' ' + card.number;
    select.appendChild(opt);
  });
}

function displayTestCard() {
  const select = document.getElementById('test-card-select');
  const details = document.getElementById('test-card-details');
  const card = TEST_CARDS[select.value];
  if (card) {
    document.getElementById('tc-number').textContent = card.number;
    document.getElementById('tc-name').textContent = card.name;
    document.getElementById('tc-expiry').textContent = card.expiry;
    document.getElementById('tc-cvv').textContent = card.cvv;
    details.style.display = 'block';
  } else {
    details.style.display = 'none';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTestCardSelector);
```

**Important:** When generating this code, the agent must populate `TEST_CARDS` with **all** card entries from the official test cases document at `https://docs-v2.payermax.com/doc-center/receipt/test-cases.md` (section "2.2 Card"). Do not hardcode only a few cards — include every card brand and variant listed in that section.

**Panel visibility rule:** only render the test panel when `sandbox: true` is configured. In production mode it must not appear.

**Panel placement:**

The test helper panel must be placed inside the **payment section** (the section that contains the Drop-In card component), directly **above** the card container element. It must NOT be placed inside the order/tip creation form, because that form is hidden when the payment section appears.

Layout structure:

```html
<!-- Step 1: Order form (hidden after submit) -->
<div id="order-form">...</div>

<!-- Step 2: Payment section (shown after order created) -->
<div id="payment-section">
  <div class="test-panel">...</div>   <!-- ← test panel HERE -->
  <div id="card-container">...</div>  <!-- PayerMax Drop-In component -->
  <button>Pay Now</button>
</div>
```

**Subject data flow (end-to-end):**

The test subject value must flow through the entire chain:

1. **Frontend** → user selects subject in test panel
2. **Frontend → Backend (create order API)** → pass subject as a dedicated field in the request body
3. **Backend (create order handler)** → persist the subject value on the order record
4. **Backend (submitPayment / orderAndPay call)** → use the persisted subject value as `data.subject` in the `/orderAndPay` request payload. Do NOT hardcode subject.

Source: https://docs-v2.payermax.com/en/doc-center/receipt/test-cases.md (section 1.1)

**Card auto-fill limitation:** The Drop-In card form runs inside a PayerMax-controlled iframe. Due to cross-origin security restrictions, the merchant page JavaScript **cannot** programmatically fill card fields. The SDK does NOT expose a `setCardInfo` or similar API. The test card selector must display card details for **manual copy** only.

## Frontend guardrails

- Do not confuse with `direct_api` — drop-in uses `Direct_Payment` as the integrate value but does NOT require PCI-DSS because the component handles card data
- `paymentToken` and `sessionKey` are mandatory in the `/orderAndPay` request; without them the payment will fail
- 3DS authentication may be triggered for card payments; the component handles the redirect flow
- Do not ignore `data.status` in the `/orderAndPay` synchronous response — for Drop-In card payments without 3DS, the final result (`SUCCESS`) may arrive synchronously without callback
- `expireTime` must be ≥ 1800 and ≤ 86400
- Google Pay / Apple Pay in subscription mode: `emit('canMakePayment')` MUST include `subscriptionPlan` and `mitManagementUrl` parameters. Calling without parameters will result in `MIT_PARAMS_VALIDATION_ERROR`.
- Google Pay / Apple Pay components use `payButtonClick` event to trigger payment — do NOT rely on an external button to call `canMakePayment` for these methods. The external "Pay" button is for Card component only.
