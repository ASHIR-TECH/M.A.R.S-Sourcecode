# Phase 11 — Donations (Flutterwave)

**Module:** `screens/Donate`
**Depends on:** Phase 2 (`useAuthStore` — donor identity for pre-fill/receipts), Phase 7 (Profile — entry point), a minimal backend endpoint (new requirement introduced by this phase, see §2.1)
**Blocks:** Nothing structurally — self-contained, optional feature

---

## 1. What this phase actually needs (before any code)

This is the one phase in the whole build that **cannot be mobile-only.** Flutterwave transactions must be verified server-side — trusting a "success" callback from the client alone is a textbook payment-fraud vector (a user could fake the callback and get credited for a donation that never happened). So this phase has two halves:

| Piece | Where it lives | Why |
|---|---|---|
| Donation UI (amount picker, donor info, "Donate" button) | Mobile app (this doc) | Standard client responsibility |
| Flutterwave Inline/Standard checkout | Mobile app, via Flutterwave's React Native SDK or a WebView-hosted checkout | Handles card/mobile-money/bank entry — you never touch raw card data yourself, which also keeps you out of PCI-DSS scope |
| **Transaction verification** | **A small backend endpoint you must stand up** (Node/Express, a Supabase Edge Function, a Firebase Cloud Function — any lightweight serverless option works) | Flutterwave's server calls your backend with the real transaction status; your backend calls Flutterwave's `/verify` API using your **secret key** to confirm the amount/currency/status actually match before marking the donation as real |
| Webhook receiver | Same backend | Flutterwave also sends an async webhook on transaction completion — this is the authoritative source of truth, more reliable than trusting the in-app callback alone |

**What you'll need to gather/set up:**
1. A Flutterwave account (business or individual, verified) — sandbox/test keys are available immediately at [dashboard.flutterwave.com](https://dashboard.flutterwave.com) without waiting on verification
2. **Public key** (`FLWPUBK_...`) — safe to embed in the mobile app
3. **Secret key** (`FLWSECK_...`) — **must never enter the mobile app or be committed to source.** Lives only in your backend's environment variables
4. **Encryption key** — used for certain direct-charge flows; also backend-only
5. A webhook URL (your backend endpoint) registered in the Flutterwave dashboard, plus a webhook secret hash to verify incoming webhook authenticity
6. A decision on currency/payment methods to support (card, mobile money, bank transfer, USSD — Flutterwave supports many; scope this to what your donor base actually needs, not everything available)
7. A minimal backend to deploy — this is new infrastructure this phase introduces; if you have zero backend today, the smallest viable option is a single serverless function (e.g. one Firebase Function or one Supabase Edge Function) with two routes: `/verify-transaction` and `/flutterwave-webhook`

**If you don't want to run a backend at all:** you cannot safely do this. Client-only Flutterwave integration means anyone can claim a donation succeeded without paying. This isn't optional hardening — it's the difference between a real donation flow and a broken one.

---

## 2. Requirements

### 2.1 Functional Requirements
| ID | Requirement |
|---|---|
| FR-1 | Donate screen: preset amount chips (e.g. $5/$10/$25/$50) + custom amount input, optional donor name/email (pre-filled from auth session if available), currency selector if supporting multiple |
| FR-2 | Tapping "Donate" launches Flutterwave's checkout (Inline SDK or hosted checkout page) with the chosen amount/currency |
| FR-3 | On checkout completion (success, cancelled, or failed), the app receives a transaction reference and **calls the backend's `/verify-transaction` endpoint** — never trusts the client-side result alone |
| FR-4 | Only once the backend confirms verification does the UI show a success state; a client-side-only "success" callback with no backend confirmation is treated as pending, not success |
| FR-5 | Failed/cancelled transactions show a clear, non-alarming message and let the user retry |
| FR-6 | Successful donations show a confirmation screen/receipt (amount, date, reference number) |
| FR-7 | (Optional, if desired) A "Donation History" row in Profile showing past donations for the signed-in user, sourced from the backend, not local storage |

### 2.2 Non-Functional Requirements
| ID | Requirement |
|---|---|
| NFR-1 | Secret key and encryption key never appear in the mobile bundle, environment files shipped to the client, or version control |
| NFR-2 | All amount/currency values are validated server-side before being marked as a confirmed donation — client-sent amounts are never trusted as-is |
| NFR-3 | Webhook endpoint validates Flutterwave's signature header before processing, to prevent spoofed webhook calls |
| NFR-4 | Donation flow works correctly in Flutterwave sandbox mode for development, with a clear switch to live keys for production (never both configured simultaneously in one build) |
| NFR-5 | No card data ever passes through your own servers or app code directly — always through Flutterwave's SDK/hosted fields |

### 2.3 Out of Scope (deferred)
- Recurring/subscription donations (Flutterwave supports this, but it's a materially bigger scope — separate phase if needed)
- Refund handling UI
- Multi-currency conversion display beyond what Flutterwave's checkout itself shows

---

## 3. Architecture & Design Decisions

### 3.1 Why verification can't be skipped
Flutterwave's client SDK returns a response object after checkout closes — but that response is generated client-side and is not cryptographic proof of payment. The **only** trustworthy confirmations are: (a) calling Flutterwave's `/transactions/{id}/verify` REST endpoint with your secret key, or (b) receiving and validating their signed webhook. This phase does both — verify immediately for fast UI feedback, and treat the webhook as the final source of truth in case the app is closed before verification completes.

### 3.2 SDK choice
Flutterwave publishes `flutterwave-react-native` for Expo/bare RN projects, which wraps their Inline checkout as a native-feeling modal. This is preferred over rolling your own WebView wrapper around their hosted checkout page — less to maintain, better UX (native modal transitions vs. a raw WebView), and it's the officially supported path.

### 3.3 Reference-based reconciliation
Every donation attempt generates a unique `tx_ref` client-side (e.g. `mars-donate-{timestamp}-{random}`) **before** checkout even opens. This reference is what ties together: the checkout session, the verification call, and the webhook event — so even if the app crashes mid-flow, the backend can later reconcile the webhook against a known reference instead of guessing.

### 3.4 State machine for the screen
```
idle → checkout_open → verifying → success
                                  ↘ failed → (user can retry) → idle
```
Same reducer-based pattern used throughout this app (FAB, QR scanner) — pure, testable, decoupled from the SDK call itself.

---

## 4. File Structure (mobile side)

```
src/
  donation/
    types.ts                        # DonationRequest, VerificationResult
    generateTxRef.ts
    donationApi.ts                   # calls YOUR backend, not Flutterwave directly for verification
    donationReducer.ts
    donationReducer.test.ts
  screens/
    Donate/
      DonateScreen.tsx
      DonateScreen.styles.ts
      DonationSuccessView.tsx
  components/
    AmountChip.tsx
```

```
backend/  (new — separate deployable, not part of the RN app bundle)
  functions/
    verifyTransaction.ts
    flutterwaveWebhook.ts
  .env                                # FLUTTERWAVE_SECRET_KEY, WEBHOOK_SECRET_HASH — never committed
```

---

## 5. Dependencies

```bash
npm install flutterwave-react-native
```

Backend (example using a simple Node/Express function — adapt to your actual serverless choice):

```bash
npm install express node-fetch
```

---

## 6. Implementation

### 6.1 Types

```ts
// src/donation/types.ts
export interface DonationRequest {
  amount: number;
  currency: string;
  txRef: string;
  donorEmail?: string;
  donorName?: string;
}

export interface VerificationResult {
  verified: boolean;
  amount?: number;
  currency?: string;
  txRef?: string;
  message?: string;
}
```

### 6.2 Reference generator

```ts
// src/donation/generateTxRef.ts
export function generateTxRef(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `mars-donate-${Date.now()}-${random}`;
}
```

### 6.3 Backend call (mobile → your server, never mobile → Flutterwave secret operations)

```ts
// src/donation/donationApi.ts
import { VerificationResult } from './types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export async function verifyDonation(txRef: string): Promise<VerificationResult> {
  const response = await fetch(`${BACKEND_URL}/verify-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txRef }),
  });

  if (!response.ok) {
    return { verified: false, message: 'Could not verify transaction. Please contact support.' };
  }

  return response.json();
}
```

### 6.4 Pure state machine

```ts
// src/donation/donationReducer.ts
export type DonationStatus = 'idle' | 'checkout_open' | 'verifying' | 'success' | 'failed';

export interface DonationState {
  status: DonationStatus;
  errorMessage: string | null;
}

export type DonationAction =
  | { type: 'OPEN_CHECKOUT' }
  | { type: 'CHECKOUT_CLOSED_SUCCESS' }
  | { type: 'CHECKOUT_CLOSED_CANCELLED' }
  | { type: 'VERIFICATION_SUCCEEDED' }
  | { type: 'VERIFICATION_FAILED'; message: string }
  | { type: 'RESET' };

export const initialDonationState: DonationState = { status: 'idle', errorMessage: null };

export function donationReducer(state: DonationState, action: DonationAction): DonationState {
  switch (action.type) {
    case 'OPEN_CHECKOUT':
      return { status: 'checkout_open', errorMessage: null };
    case 'CHECKOUT_CLOSED_SUCCESS':
      return { status: 'verifying', errorMessage: null };
    case 'CHECKOUT_CLOSED_CANCELLED':
      return { status: 'idle', errorMessage: null };
    case 'VERIFICATION_SUCCEEDED':
      return { status: 'success', errorMessage: null };
    case 'VERIFICATION_FAILED':
      return { status: 'failed', errorMessage: action.message };
    case 'RESET':
      return initialDonationState;
    default:
      return state;
  }
}
```

### 6.5 Amount chip

```tsx
// src/components/AmountChip.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface AmountChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function AmountChip({ label, active, onPress }: AmountChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: colors.accent },
  label: { color: colors.textMuted, fontWeight: '600' },
  labelActive: { color: '#0B0704' },
});
```

### 6.6 Donate screen

```tsx
// src/screens/Donate/DonateScreen.tsx
import React, { useReducer, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import FlutterwaveCheckout from 'flutterwave-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { generateTxRef } from '../../donation/generateTxRef';
import { verifyDonation } from '../../donation/donationApi';
import { donationReducer, initialDonationState } from '../../donation/donationReducer';
import { AmountChip } from '../../components/AmountChip';
import { DonationSuccessView } from './DonationSuccessView';
import { styles } from './DonateScreen.styles';

const PRESET_AMOUNTS = [5, 10, 25, 50];
const FLUTTERWAVE_PUBLIC_KEY = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? '';

export function DonateScreen() {
  const { session } = useAuthStore();
  const [state, dispatch] = useReducer(donationReducer, initialDonationState);
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [txRef, setTxRef] = useState('');

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const handleDonatePress = () => {
    if (!finalAmount || finalAmount <= 0) return;
    setTxRef(generateTxRef());
    dispatch({ type: 'OPEN_CHECKOUT' });
  };

  const handleCheckoutComplete = async (response: any) => {
    if (response?.status !== 'successful') {
      dispatch({ type: 'CHECKOUT_CLOSED_CANCELLED' });
      return;
    }

    dispatch({ type: 'CHECKOUT_CLOSED_SUCCESS' });
    const result = await verifyDonation(txRef);

    if (result.verified) {
      dispatch({ type: 'VERIFICATION_SUCCEEDED' });
    } else {
      dispatch({ type: 'VERIFICATION_FAILED', message: result.message ?? 'Verification failed.' });
    }
  };

  if (state.status === 'success') {
    return (
      <DonationSuccessView
        amount={finalAmount}
        txRef={txRef}
        onDone={() => dispatch({ type: 'RESET' })}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Support Mars</Text>
      <Text style={styles.subtitle}>
        Your donation helps keep the station running and development active.
      </Text>

      <View style={styles.chipRow}>
        {PRESET_AMOUNTS.map((amt) => (
          <AmountChip
            key={amt}
            label={`$${amt}`}
            active={!customAmount && selectedAmount === amt}
            onPress={() => {
              setSelectedAmount(amt);
              setCustomAmount('');
            }}
          />
        ))}
      </View>

      <TextInput
        value={customAmount}
        onChangeText={setCustomAmount}
        placeholder="Custom amount (USD)"
        placeholderTextColor="#8A7A68"
        keyboardType="numeric"
        style={styles.customInput}
      />

      {state.status === 'failed' && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {state.errorMessage}
        </Text>
      )}

      <Pressable style={styles.donateButton} onPress={handleDonatePress}>
        <Text style={styles.donateButtonText}>
          {state.status === 'verifying' ? 'Verifying…' : `Donate $${finalAmount || 0}`}
        </Text>
      </Pressable>

      {state.status === 'checkout_open' && (
        <FlutterwaveCheckout
          options={{
            tx_ref: txRef,
            authorization: FLUTTERWAVE_PUBLIC_KEY,
            customer: {
              email: session?.email ?? 'donor@example.com',
              name: session?.fullName ?? 'Anonymous Donor',
            },
            amount: finalAmount,
            currency: 'USD',
            payment_options: 'card,mobilemoney,ussd',
          }}
          customButton={() => null}
          onRedirect={handleCheckoutComplete}
        />
      )}
    </ScrollView>
  );
}
```

### 6.7 Success view

```tsx
// src/screens/Donate/DonationSuccessView.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DonationSuccessViewProps {
  amount: number;
  txRef: string;
  onDone: () => void;
}

export function DonationSuccessView({ amount, txRef, onDone }: DonationSuccessViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thank You</Text>
      <Text style={styles.body}>Your donation of ${amount} has been received.</Text>
      <Text style={styles.ref}>Reference: {txRef}</Text>
      <Pressable style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  body: { color: colors.textMuted, textAlign: 'center' },
  ref: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  button: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  buttonText: { color: '#0B0704', fontWeight: '700' },
});
```

### 6.8 Styles

```ts
// src/screens/Donate/DonateScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  errorText: { color: '#E05A47', fontSize: 13 },
  donateButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  donateButtonText: { color: '#0B0704', fontWeight: '700', fontSize: 15 },
});
```

### 6.9 Backend — verification endpoint (example, adapt to your platform)

```ts
// backend/functions/verifyTransaction.ts
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY!; // never in mobile app

router.post('/verify-transaction', async (req, res) => {
  const { txRef } = req.body;

  try {
    // Look up the transaction by reference via Flutterwave's API.
    const lookup = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
    );
    const data = await lookup.json();

    const isSuccessful =
      data?.status === 'success' && data?.data?.status === 'successful';

    if (!isSuccessful) {
      return res.json({ verified: false, message: 'Transaction not confirmed.' });
    }

    // TODO: persist the confirmed donation (amount, currency, txRef, donor) to your database here.

    return res.json({
      verified: true,
      amount: data.data.amount,
      currency: data.data.currency,
      txRef,
    });
  } catch (err) {
    return res.status(500).json({ verified: false, message: 'Verification request failed.' });
  }
});

export default router;
```

### 6.10 Backend — webhook receiver (authoritative fallback)

```ts
// backend/functions/flutterwaveWebhook.ts
import express from 'express';
import crypto from 'crypto';

const router = express.Router();
const WEBHOOK_SECRET_HASH = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH!;

router.post('/flutterwave-webhook', express.json(), (req, res) => {
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== WEBHOOK_SECRET_HASH) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    // TODO: reconcile against tx_ref in your database — mark donation confirmed
    // even if the mobile app never completed the client-side verify call
    // (e.g. user closed the app mid-flow).
  }

  res.sendStatus(200);
});

export default router;
```

---

## 7. Testing

```ts
// src/donation/donationReducer.test.ts
import { donationReducer, initialDonationState } from './donationReducer';

describe('donationReducer', () => {
  it('opens checkout', () => {
    const next = donationReducer(initialDonationState, { type: 'OPEN_CHECKOUT' });
    expect(next.status).toBe('checkout_open');
  });

  it('moves to verifying on checkout success', () => {
    const open = { status: 'checkout_open' as const, errorMessage: null };
    const next = donationReducer(open, { type: 'CHECKOUT_CLOSED_SUCCESS' });
    expect(next.status).toBe('verifying');
  });

  it('returns to idle on cancellation, no error shown', () => {
    const open = { status: 'checkout_open' as const, errorMessage: null };
    const next = donationReducer(open, { type: 'CHECKOUT_CLOSED_CANCELLED' });
    expect(next.status).toBe('idle');
    expect(next.errorMessage).toBeNull();
  });

  it('moves to success on verification success', () => {
    const verifying = { status: 'verifying' as const, errorMessage: null };
    const next = donationReducer(verifying, { type: 'VERIFICATION_SUCCEEDED' });
    expect(next.status).toBe('success');
  });

  it('moves to failed with a message on verification failure', () => {
    const verifying = { status: 'verifying' as const, errorMessage: null };
    const next = donationReducer(verifying, { type: 'VERIFICATION_FAILED', message: 'no match' });
    expect(next.status).toBe('failed');
    expect(next.errorMessage).toBe('no match');
  });
});
```

**Manual QA checklist (sandbox mode):**
- [ ] Preset and custom amount selection both work and are mutually exclusive
- [ ] Checkout opens with Flutterwave's test cards (documented in their sandbox docs) and completes
- [ ] Cancelling checkout returns cleanly to the idle state, no error shown
- [ ] A successful sandbox transaction is confirmed by your backend's `/verify-transaction` call, not just the client callback
- [ ] Killing the app immediately after a successful charge (before verification completes) still results in the webhook confirming the donation server-side
- [ ] Attempting to tamper with the amount sent to checkout vs. what's verified server-side is caught (test by manually mismatching values in a dev build)
- [ ] No secret key, encryption key, or webhook secret appears anywhere in the mobile bundle (grep the built app for the key prefixes as a sanity check)

---

## 8. Acceptance Criteria (Definition of Done)

- [ ] Donation UI matches app's visual language (reuses theme tokens, consistent with other screens)
- [ ] Every donation is confirmed via backend verification before showing success — no client-only success path exists
- [ ] Webhook endpoint validates Flutterwave's signature before trusting any payload
- [ ] Secret key, encryption key, and webhook secret exist only in backend environment variables — never in the mobile repo or bundle
- [ ] `donationReducer` is fully unit tested independent of the SDK
- [ ] Sandbox-mode donations work end-to-end before any live key is introduced
- [ ] A documented, deployed backend endpoint exists and is reachable from the app via `EXPO_PUBLIC_BACKEND_URL`
