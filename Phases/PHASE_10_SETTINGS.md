# Phase 10 — Settings Screen

**Module:** `screens/Settings`
**Depends on:** Phase 7 (`SettingsRow`, `SettingsSection` — reused verbatim)

---

## 1. Requirements

| ID | Requirement |
|---|---|
| FR-1 | Sections: Appearance (theme — v1 dark-only, shown as informational), Notifications (toggles), Connection (relay URL override for advanced/dev use, connection status), About (version, licenses, terms/privacy links) |
| FR-2 | Notification toggles use standard `Switch` component, persist locally |
| FR-3 | "Connection" section is read-only status display + a "Forget Paired Device" destructive action (clears pairing via `usePairingStore.clearPairing`) |
| FR-4 | About section shows app version (from `expo-constants`), and links to Terms/Privacy (same URLs as Phase 2's Sign In footer — single source of truth) |

## 2. Design Decisions

- **Reuses `SettingsRow`/`SettingsSection` from Phase 7 exactly** — Settings and Profile are the two "grouped list" screens in the app; they must look identical in primitive, per Phase 7's NFR-3.
- **Terms/Privacy URLs centralized** in one constants file so Phase 2 and Phase 10 never drift apart.

## 3. File Structure

```
src/
  constants/legalLinks.ts
  store/useNotificationPrefsStore.ts
  screens/Settings/SettingsScreen.tsx
  screens/Settings/SettingsScreen.styles.ts
```

## 4. Implementation

```ts
// src/constants/legalLinks.ts
export const TERMS_URL = 'https://example.com/terms';
export const PRIVACY_URL = 'https://example.com/privacy';
```

> Update Phase 2's `SignInScreen.tsx` to import these constants instead of its own local copies, eliminating duplication.

```ts
// src/store/useNotificationPrefsStore.ts
import { create } from 'zustand';

interface NotificationPrefsState {
  deviceAlerts: boolean;
  chatMessages: boolean;
  systemUpdates: boolean;
  toggle: (key: 'deviceAlerts' | 'chatMessages' | 'systemUpdates') => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  deviceAlerts: true,
  chatMessages: true,
  systemUpdates: false,
  toggle: (key) => set({ [key]: !get()[key] } as any),
}));
```

> v1 keeps prefs in-memory via zustand. Persisting across restarts is a one-line addition using `zustand/middleware`'s `persist` with `AsyncStorage` (non-sensitive data — fine here, unlike auth/pairing tokens).

```tsx
// src/screens/Settings/SettingsScreen.tsx
import React from 'react';
import { ScrollView, Text, Switch, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { usePairingStore } from '../../store/usePairingStore';
import { useConnectionStore } from '../../store/useConnectionStore';
import { useNotificationPrefsStore } from '../../store/useNotificationPrefsStore';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { TERMS_URL, PRIVACY_URL } from '../../constants/legalLinks';
import { colors } from '../../theme/colors';
import { styles } from './SettingsScreen.styles';

export function SettingsScreen() {
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const connectionStatus = useConnectionStore((s) => s.status);
  const clearPairing = usePairingStore((s) => s.clearPairing);
  const { deviceAlerts, chatMessages, systemUpdates, toggle } = useNotificationPrefsStore();

  const handleForgetDevice = () => {
    Alert.alert(
      'Forget Paired Device',
      'This will disconnect the app from your desktop. You will need to re-scan a QR code to reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Forget Device', style: 'destructive', onPress: () => clearPairing() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>SETTINGS</Text>

      <SettingsSection title="Notifications">
        <SettingsRow
          label="Device Alerts"
          showChevron={false}
          icon={<Switch value={deviceAlerts} onValueChange={() => toggle('deviceAlerts')} />}
        />
        <SettingsRow
          label="Chat Messages"
          showChevron={false}
          icon={<Switch value={chatMessages} onValueChange={() => toggle('chatMessages')} />}
        />
        <SettingsRow
          label="System Updates"
          showChevron={false}
          icon={<Switch value={systemUpdates} onValueChange={() => toggle('systemUpdates')} />}
        />
      </SettingsSection>

      <SettingsSection title="Connection">
        <SettingsRow
          label="Paired Desktop"
          value={pairedDesktop?.desktopName ?? 'None'}
          showChevron={false}
        />
        <SettingsRow
          label="Status"
          value={connectionStatus}
          showChevron={false}
        />
        {pairedDesktop && (
          <SettingsRow label="Forget Paired Device" onPress={handleForgetDevice} destructive showChevron={false} />
        )}
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} showChevron={false} />
        <SettingsRow label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
        <SettingsRow label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
      </SettingsSection>
    </ScrollView>
  );
}
```

```ts
// src/screens/Settings/SettingsScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  screenTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
});
```

## 5. Testing

```ts
// src/store/useNotificationPrefsStore.test.ts
import { useNotificationPrefsStore } from './useNotificationPrefsStore';

describe('useNotificationPrefsStore', () => {
  it('toggles a preference independently of others', () => {
    const before = useNotificationPrefsStore.getState();
    useNotificationPrefsStore.getState().toggle('deviceAlerts');
    const after = useNotificationPrefsStore.getState();
    expect(after.deviceAlerts).toBe(!before.deviceAlerts);
    expect(after.chatMessages).toBe(before.chatMessages);
  });
});
```

**Manual QA checklist:**
- [ ] Toggles flip immediately, no lag
- [ ] "Forget Paired Device" shows confirmation, clears pairing, and (per Phase 5/6 wiring) drops the relay connection cleanly
- [ ] Terms/Privacy links open correctly and match Phase 2's Sign In footer exactly
- [ ] Version number reflects actual `app.json` version

## 6. Acceptance Criteria

- [ ] Reuses `SettingsRow`/`SettingsSection` from Phase 7 with zero visual divergence
- [ ] Forgetting a paired device correctly tears down the Phase 6 relay connection (verify `useRelayConnection`'s cleanup fires)
- [ ] Terms/Privacy URLs sourced from one shared constants file, referenced by both Phase 2 and this screen
