# Phase 5 — QR Pairing

**Module:** `screens/QRScanner`
**Depends on:** Phase 1 (theme, `MarsLogo`), Phase 2 (authenticated session — pairing is tied to an account)
**Blocks:** Phase 6 (Relay Client) — pairing produces the credentials the relay connection needs; Device Hub's "add device" flow later reuses this screen

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Screen shows camera viewfinder with a square scan-target overlay, "QR SCANNER" header, "Scan to Connect" title, instructional subtitle, matching Figma frame `mars-qr-scanner` |
| FR-2 | App requests camera permission on first entry; if denied, shows a clear explanation + a button to open system settings |
| FR-3 | When a valid pairing QR code is detected, scanning pauses immediately (no duplicate scans) and a "Pairing…" state is shown |
| FR-4 | QR payload is parsed and validated against an expected schema before being treated as trustworthy |
| FR-5 | On successful payload validation, the pairing token + desktop identity are persisted and the screen navigates to a success state / back to Home |
| FR-6 | On invalid/malformed QR content, an inline error is shown and scanning automatically resumes after a short delay — user is not stuck |
| FR-7 | On expired pairing token (validated with the relay in Phase 6, or a local timestamp check if relay isn't live yet), a clear "this code has expired, generate a new one on desktop" message is shown |
| FR-8 | Manual close/back action is always available regardless of scan state |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | QR payload parsing/validation is pure logic, fully unit-testable without a camera or device |
| NFR-2 | Scanning is debounced/locked after first valid detection — never fires the success handler twice for one code |
| NFR-3 | No pairing secret is logged to console in release builds |
| NFR-4 | Screen works identically whether Phase 6's relay is live or still mocked — validation of the *shape* of the QR payload doesn't require a network call, only confirming the token isn't expired/malformed |
| NFR-5 | Camera resources are released when the screen unmounts (no battery drain from a backgrounded live camera) |

### 1.3 Out of Scope (deferred)
- Actually authenticating the pairing token against a live relay (that's Phase 6's `relayClient.authenticate()` — this phase produces the token and calls a stubbed/injected verification function)
- Multi-device re-pairing / conflict resolution (pairing to a second desktop while one is already paired) — flagged as a fast-follow
- Generating the QR code on the desktop side — out of scope for this mobile-focused build entirely

---

## 2. Architecture & Design Decisions

### 2.1 Payload contract (defined now, shared with Phase 6)
The QR code encodes a JSON payload the desktop app must produce. Defining this contract here — even before the relay exists — means Phase 6 can build against a known shape instead of guessing:

```ts
interface PairingPayload {
  version: 1;
  desktopId: string;
  desktopName: string;
  pairingToken: string;
  issuedAt: string;   // ISO 8601
  expiresAt: string;  // ISO 8601
  relayUrl: string;   // wss:// endpoint the mobile app should connect to
}
```

`relayUrl` being embedded in the QR itself (rather than hardcoded in the app) is deliberate — it means the relay endpoint can be environment-specific (staging/prod, or even self-hosted relays) without an app rebuild.

### 2.2 Validation as a pure, isolated function
`parsePairingPayload(raw: string): PairingPayload | PairingError` lives entirely outside any React/camera code. It:
1. Attempts JSON parse — malformed JSON → `PairingError`
2. Validates required fields exist and are the right type — missing/wrong-typed field → `PairingError`
3. Checks `expiresAt` against current time — expired → `PairingError`

This mirrors the same pattern used for `fabReducer` and the color engine earlier: gnarly logic that's easy to get subtly wrong stays out of component code so it can be tested with plain input/output assertions, no simulator required.

### 2.3 Why `expo-camera`'s `CameraView` with `onBarcodeScanned`
`expo-camera` (not the deprecated `expo-barcode-scanner`) is the current standard, actively maintained path, and already fits the Expo-managed workflow the rest of this app uses. Its `onBarcodeScanned` callback is disabled/re-enabled manually (via a ref/state flag) to implement the "lock after first valid scan" requirement (NFR-2) — this callback would otherwise fire dozens of times per second while the code stays in frame.

### 2.4 State machine for the screen
```
idle (scanning) → detected → validating → success
                                        ↘ error → (auto) idle (scanning)
```
Implemented as a small typed union, same reducer pattern as the FAB — keeps the screen's `useEffect`/render logic simple and makes every transition explicit and testable.

### 2.5 Secure storage, again
Following the same rule established in Phase 2 for the auth session: the pairing token is written via `expo-secure-store`, never `AsyncStorage`. A second store, `usePairingStore`, mirrors `useAuthStore`'s shape but is scoped to desktop-pairing state rather than user auth — kept separate because a user's auth session and their paired-desktop(s) are different lifecycles (you can sign out without un-pairing, for instance).

---

## 3. File Structure

```
src/
  pairing/
    types.ts                       # PairingPayload, PairingError
    parsePairingPayload.ts
    parsePairingPayload.test.ts
    pairingStorage.ts              # secure-store read/write/clear for pairing data
  store/
    usePairingStore.ts
  screens/
    QRScanner/
      QRScannerScreen.tsx
      QRScannerScreen.styles.ts
      qrScannerReducer.ts
      qrScannerReducer.test.ts
      PermissionDeniedView.tsx
```

---

## 4. Dependencies

```bash
npx expo install expo-camera
```

Add camera usage description (required by both platforms):

```json
// app.json (relevant excerpt)
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Mars needs camera access to scan your desktop's pairing code."
      }
    },
    "android": {
      "permissions": ["CAMERA"]
    }
  }
}
```

---

## 5. Implementation

### 5.1 Pairing payload types

```ts
// src/pairing/types.ts
export interface PairingPayload {
  version: 1;
  desktopId: string;
  desktopName: string;
  pairingToken: string;
  issuedAt: string;
  expiresAt: string;
  relayUrl: string;
}

export type PairingErrorReason = 'malformed' | 'invalid_schema' | 'expired' | 'unsupported_version';

export interface PairingError {
  reason: PairingErrorReason;
  message: string;
}
```

### 5.2 Pure validation function

```ts
// src/pairing/parsePairingPayload.ts
import { PairingPayload, PairingError } from './types';

function isPairingErrorFree(payload: any): payload is PairingPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    payload.version === 1 &&
    typeof payload.desktopId === 'string' &&
    typeof payload.desktopName === 'string' &&
    typeof payload.pairingToken === 'string' &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.relayUrl === 'string'
  );
}

export function parsePairingPayload(raw: string): PairingPayload | PairingError {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: 'malformed', message: 'This QR code is not a valid pairing code.' };
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    (parsed as any).version !== 1
  ) {
    return { reason: 'unsupported_version', message: 'This pairing code is from an unsupported app version.' };
  }

  if (!isPairingErrorFree(parsed)) {
    return { reason: 'invalid_schema', message: 'This QR code is missing required pairing information.' };
  }

  const expiresAt = new Date(parsed.expiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return { reason: 'expired', message: 'This pairing code has expired. Generate a new one on your desktop.' };
  }

  return parsed;
}

export function isPairingError(value: PairingPayload | PairingError): value is PairingError {
  return 'reason' in value;
}
```

### 5.3 Secure pairing storage

```ts
// src/pairing/pairingStorage.ts
import * as SecureStore from 'expo-secure-store';
import { PairingPayload } from './types';

const PAIRING_KEY = 'mars.pairing.desktop';

export const pairingStorage = {
  async save(payload: PairingPayload): Promise<void> {
    await SecureStore.setItemAsync(PAIRING_KEY, JSON.stringify(payload));
  },
  async load(): Promise<PairingPayload | null> {
    const raw = await SecureStore.getItemAsync(PAIRING_KEY);
    return raw ? (JSON.parse(raw) as PairingPayload) : null;
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(PAIRING_KEY);
  },
};
```

### 5.4 Pairing store

```ts
// src/store/usePairingStore.ts
import { create } from 'zustand';
import { PairingPayload } from '../pairing/types';
import { pairingStorage } from '../pairing/pairingStorage';

interface PairingState {
  pairedDesktop: PairingPayload | null;
  setPairedDesktop: (payload: PairingPayload) => Promise<void>;
  clearPairing: () => Promise<void>;
  restorePairing: () => Promise<void>;
}

export const usePairingStore = create<PairingState>((set) => ({
  pairedDesktop: null,

  setPairedDesktop: async (payload) => {
    await pairingStorage.save(payload);
    set({ pairedDesktop: payload });
  },

  clearPairing: async () => {
    await pairingStorage.clear();
    set({ pairedDesktop: null });
  },

  restorePairing: async () => {
    const stored = await pairingStorage.load();
    if (stored) set({ pairedDesktop: stored });
  },
}));
```

### 5.5 Screen-local state machine

```ts
// src/screens/QRScanner/qrScannerReducer.ts
import { PairingError } from '../../pairing/types';

export type ScanStatus = 'scanning' | 'validating' | 'success' | 'error';

export interface ScanState {
  status: ScanStatus;
  error: PairingError | null;
}

export type ScanAction =
  | { type: 'CODE_DETECTED' }
  | { type: 'VALIDATION_SUCCEEDED' }
  | { type: 'VALIDATION_FAILED'; error: PairingError }
  | { type: 'RESUME_SCANNING' };

export const initialScanState: ScanState = { status: 'scanning', error: null };

export function qrScannerReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'CODE_DETECTED':
      return { status: 'validating', error: null };
    case 'VALIDATION_SUCCEEDED':
      return { status: 'success', error: null };
    case 'VALIDATION_FAILED':
      return { status: 'error', error: action.error };
    case 'RESUME_SCANNING':
      return { status: 'scanning', error: null };
    default:
      return state;
  }
}
```

### 5.6 Permission-denied view

```tsx
// src/screens/QRScanner/PermissionDeniedView.tsx
import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function PermissionDeniedView() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Access Needed</Text>
      <Text style={styles.body}>
        Mars needs camera access to scan your desktop's pairing code. You can enable it in
        Settings.
      </Text>
      <Pressable style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  body: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  buttonText: { color: '#0B0704', fontWeight: '700' },
});
```

### 5.7 The QR Scanner screen

```tsx
// src/screens/QRScanner/QRScannerScreen.tsx
import React, { useReducer, useRef, useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { parsePairingPayload, isPairingError } from '../../pairing/parsePairingPayload';
import { usePairingStore } from '../../store/usePairingStore';
import { qrScannerReducer, initialScanState } from './qrScannerReducer';
import { PermissionDeniedView } from './PermissionDeniedView';
import { styles } from './QRScannerScreen.styles';

interface QRScannerScreenProps {
  onPaired: () => void;
  onClose: () => void;
}

const ERROR_RESUME_DELAY_MS = 2000;

export function QRScannerScreen({ onPaired, onClose }: QRScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, dispatch] = useReducer(qrScannerReducer, initialScanState);
  const setPairedDesktop = usePairingStore((s) => s.setPairedDesktop);

  // Guards against onBarcodeScanned firing repeatedly for the same code
  // while it remains in frame — see NFR-2.
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (state.status === 'error') {
      const timeout = setTimeout(() => {
        isLockedRef.current = false;
        dispatch({ type: 'RESUME_SCANNING' });
      }, ERROR_RESUME_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [state.status]);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      dispatch({ type: 'CODE_DETECTED' });

      const parsed = parsePairingPayload(result.data);

      if (isPairingError(parsed)) {
        dispatch({ type: 'VALIDATION_FAILED', error: parsed });
        return;
      }

      await setPairedDesktop(parsed);
      dispatch({ type: 'VALIDATION_SUCCEEDED' });
      onPaired();
    },
    [onPaired, setPairedDesktop]
  );

  if (!permission) return null; // permission status still loading
  if (!permission.granted) return <PermissionDeniedView />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR SCANNER</Text>
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={state.status === 'scanning' ? handleBarcodeScanned : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.scanTarget} />
        </View>
      </CameraView>

      <View style={styles.footer}>
        <Text style={styles.title}>Scan to Connect</Text>
        <Text style={styles.subtitle}>
          Align the station's QR code within the boundaries to establish peer link
        </Text>

        {state.status === 'validating' && <Text style={styles.statusText}>Pairing…</Text>}
        {state.status === 'error' && state.error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {state.error.message}
          </Text>
        )}
      </View>
    </View>
  );
}
```

### 5.8 Styles

```ts
// src/screens/QRScanner/QRScannerScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SCAN_TARGET_SIZE = 240;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingVertical: spacing.lg },
  headerTitle: { color: colors.textMuted, letterSpacing: 2, fontSize: 13 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanTarget: {
    width: SCAN_TARGET_SIZE,
    height: SCAN_TARGET_SIZE,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  statusText: { color: colors.accent, fontSize: 13, marginTop: spacing.sm },
  errorText: { color: '#E05A47', fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
```

---

## 6. Testing

```ts
// src/pairing/parsePairingPayload.test.ts
import { parsePairingPayload, isPairingError } from './parsePairingPayload';

const validPayload = {
  version: 1,
  desktopId: 'desktop-abc123',
  desktopName: 'ZEUS-MAIN-PC',
  pairingToken: 'tok_xyz',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  relayUrl: 'wss://relay.example.com',
};

describe('parsePairingPayload', () => {
  it('returns the payload for valid JSON matching the schema', () => {
    const result = parsePairingPayload(JSON.stringify(validPayload));
    expect(isPairingError(result)).toBe(false);
  });

  it('returns a malformed error for invalid JSON', () => {
    const result = parsePairingPayload('not json');
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('malformed');
  });

  it('returns an invalid_schema error when a required field is missing', () => {
    const { pairingToken, ...incomplete } = validPayload;
    const result = parsePairingPayload(JSON.stringify(incomplete));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('invalid_schema');
  });

  it('returns an expired error when expiresAt is in the past', () => {
    const expired = { ...validPayload, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const result = parsePairingPayload(JSON.stringify(expired));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('expired');
  });

  it('returns an unsupported_version error for a future/unknown version', () => {
    const futureVersion = { ...validPayload, version: 2 };
    const result = parsePairingPayload(JSON.stringify(futureVersion));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('unsupported_version');
  });
});
```

```ts
// src/screens/QRScanner/qrScannerReducer.test.ts
import { qrScannerReducer, initialScanState } from './qrScannerReducer';

describe('qrScannerReducer', () => {
  it('moves to validating on CODE_DETECTED', () => {
    const next = qrScannerReducer(initialScanState, { type: 'CODE_DETECTED' });
    expect(next.status).toBe('validating');
  });

  it('moves to success on VALIDATION_SUCCEEDED', () => {
    const validating = { status: 'validating' as const, error: null };
    const next = qrScannerReducer(validating, { type: 'VALIDATION_SUCCEEDED' });
    expect(next.status).toBe('success');
  });

  it('moves to error and stores the error on VALIDATION_FAILED', () => {
    const validating = { status: 'validating' as const, error: null };
    const error = { reason: 'expired' as const, message: 'expired' };
    const next = qrScannerReducer(validating, { type: 'VALIDATION_FAILED', error });
    expect(next.status).toBe('error');
    expect(next.error).toEqual(error);
  });

  it('returns to scanning on RESUME_SCANNING', () => {
    const errored = { status: 'error' as const, error: { reason: 'expired' as const, message: 'x' } };
    const next = qrScannerReducer(errored, { type: 'RESUME_SCANNING' });
    expect(next.status).toBe('scanning');
    expect(next.error).toBeNull();
  });
});
```

**Manual QA checklist:**
- [ ] First launch prompts for camera permission; denying shows `PermissionDeniedView` with a working "Open Settings" link
- [ ] Scanning a valid pairing QR locks scanning immediately, shows "Pairing…", then succeeds
- [ ] Scanning garbage/non-pairing QR shows the inline error, then auto-resumes scanning after ~2s
- [ ] Scanning an expired pairing QR shows the expired-specific message
- [ ] Successful pairing persists across app restart (verify via `usePairingStore().restorePairing()` on relaunch)
- [ ] Backgrounding the app while camera is active and returning doesn't crash or leave camera in a broken state
- [ ] Screen correctly releases the camera on navigating away (check for battery/heat issues on a physical device during extended testing)

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] Screen matches Figma frame `mars-qr-scanner`
- [ ] `parsePairingPayload` is fully unit tested for valid, malformed, missing-field, expired, and version-mismatch cases
- [ ] Scanning locks after first valid detection — no duplicate-fire bugs
- [ ] Camera permission denial is handled gracefully, never a silent black screen
- [ ] Pairing payload is persisted via `expo-secure-store`, not `AsyncStorage`
- [ ] `relayUrl` and `pairingToken` from a successful scan are available to Phase 6 via `usePairingStore`
- [ ] No pairing token is ever logged in a release build
