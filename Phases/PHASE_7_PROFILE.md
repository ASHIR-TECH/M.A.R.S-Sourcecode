# Phase 7 — Profile Screen (Industry Standard)

**Module:** `screens/Profile`
**Depends on:** Phase 2 (`useAuthStore` — user identity), Phase 6 (relay, for paired-desktop info), Phase 4 (accessible from Settings tab or avatar tap on Home)
**Blocks:** Nothing structurally — self-contained

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Shows avatar (initials or provider photo), display name, email, auth provider badge (Google/Apple) |
| FR-2 | Shows paired desktop info: name, OS, pairing date, connection status |
| FR-3 | Standard account actions: Edit Profile (name only — v1), Manage Paired Devices (→ Device Hub), Notification Preferences, Privacy & Security, Help/Support, Sign Out |
| FR-4 | Sign Out clears auth session (`useAuthStore.signOut`) and returns to Sign In screen; does **not** clear pairing (separate concern, per Phase 5 design note) |
| FR-5 | Destructive action ("Sign Out", future "Delete Account") requires a confirmation dialog |
| FR-6 | Avatar shows provider photo if available (Google/Apple may supply one); falls back to initials on a colored circle if not |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Follows standard "grouped settings list" pattern (iOS Settings / Android Settings-style rows) — this is itself a Jakob's Law application: profile/account screens across almost all apps share this exact list-of-rows-with-chevron shape |
| NFR-2 | No sensitive data (tokens) rendered directly in UI, ever |
| NFR-3 | List rows are componentized (`SettingsRow`) so Phase 8's Settings screen reuses the identical row primitive — one visual language for all "list of options" screens app-wide |

### 1.3 Out of Scope (deferred)
- Editable avatar upload — v1 reads provider photo only
- Multi-account switching

---

## 2. Design Decisions

- **Grouped sections, not a flat list** — Account, Devices, Preferences, Support, Session — mirrors iOS/Android Settings conventions users already know.
- **`SettingsRow` as the universal primitive**, reused verbatim in Phase 10 (Settings). One component, two screens.
- **Confirmation dialogs use the platform `Alert` API**, not a custom modal — again, least novel path for a destructive, well-understood action.

---

## 3. File Structure

```
src/
  components/
    SettingsRow.tsx
    SettingsSection.tsx
    Avatar.tsx
  screens/
    Profile/
      ProfileScreen.tsx
      ProfileScreen.styles.ts
```

---

## 4. Implementation

### 4.1 Reusable primitives

```tsx
// src/components/Avatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface AvatarProps {
  photoUrl?: string;
  fallbackInitials: string;
  size?: number;
}

export function Avatar({ photoUrl, fallbackInitials, size = 64 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={dimension} />;
  }
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{fallbackInitials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#0B0704', fontWeight: '700' },
});
```

```tsx
// src/components/SettingsRow.tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsRow({ label, value, icon, onPress, destructive, showChevron = true }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        {icon}
        <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value && <Text style={styles.value}>{value}</Text>}
        {showChevron && !destructive && <Text style={styles.chevron}>{'›'}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.textPrimary, fontSize: 14 },
  destructive: { color: '#E05A47' },
  value: { color: colors.textMuted, fontSize: 13 },
  chevron: { color: colors.textMuted, fontSize: 16 },
});
```

```tsx
// src/components/SettingsSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  title: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
```

### 4.2 Profile screen

```tsx
// src/screens/Profile/ProfileScreen.tsx
import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { usePairingStore } from '../../store/usePairingStore';
import { useConnectionStore } from '../../store/useConnectionStore';
import { Avatar } from '../../components/Avatar';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { styles } from './ProfileScreen.styles';

interface ProfileScreenProps {
  onNavigateDeviceHub: () => void;
  onNavigateNotifications: () => void;
  onNavigatePrivacy: () => void;
  onNavigateHelp: () => void;
}

function initialsFrom(name?: string, email?: string): string {
  const source = name ?? email ?? '?';
  return source
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen({
  onNavigateDeviceHub,
  onNavigateNotifications,
  onNavigatePrivacy,
  onNavigateHelp,
}: ProfileScreenProps) {
  const { session, signOut } = useAuthStore();
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const connectionStatus = useConnectionStore((s) => s.status);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar fallbackInitials={initialsFrom(session?.fullName, session?.email)} size={72} />
        <Text style={styles.name}>{session?.fullName ?? 'Operator'}</Text>
        <Text style={styles.email}>{session?.email ?? ''}</Text>
        <Text style={styles.provider}>
          Signed in with {session?.provider === 'apple' ? 'Apple' : 'Google'}
        </Text>
      </View>

      <SettingsSection title="Paired Desktop">
        {pairedDesktop ? (
          <>
            <SettingsRow label="Device" value={pairedDesktop.desktopName} showChevron={false} />
            <SettingsRow
              label="Status"
              value={connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              showChevron={false}
            />
          </>
        ) : (
          <SettingsRow label="No desktop paired" showChevron={false} />
        )}
        <SettingsRow label="Manage Devices" onPress={onNavigateDeviceHub} />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow label="Notifications" onPress={onNavigateNotifications} />
        <SettingsRow label="Privacy & Security" onPress={onNavigatePrivacy} />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow label="Help & Support" onPress={onNavigateHelp} />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow label="Sign Out" onPress={handleSignOut} destructive showChevron={false} />
      </SettingsSection>
    </ScrollView>
  );
}
```

### 4.3 Styles

```ts
// src/screens/Profile/ProfileScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { alignItems: 'center', gap: 4, marginBottom: spacing.xl },
  name: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm },
  email: { color: colors.textMuted, fontSize: 13 },
  provider: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
```

---

## 5. Testing

```ts
// initialsFrom is small enough to inline-test as a pure function
import { initialsFrom } from './ProfileScreen'; // export it if testing separately

describe('initialsFrom', () => {
  it('derives initials from a full name', () => {
    expect(initialsFrom('Ashir Khan', undefined)).toBe('AK');
  });
  it('falls back to email when no name', () => {
    expect(initialsFrom(undefined, 'op@mars.io')).toBe('O');
  });
  it('falls back to ? when nothing available', () => {
    expect(initialsFrom(undefined, undefined)).toBe('?');
  });
});
```

**Manual QA checklist:**
- [ ] Avatar shows provider photo when available, initials fallback otherwise
- [ ] Paired desktop section reflects live connection status
- [ ] Sign Out shows confirmation, cancels cleanly on "Cancel"
- [ ] Confirmed Sign Out returns to Sign In screen and clears session only (pairing persists)

---

## 6. Acceptance Criteria

- [ ] Grouped-list layout matches standard OS settings conventions
- [ ] `SettingsRow`/`SettingsSection` are shared, not duplicated in Phase 10
- [ ] Sign Out requires confirmation and never fires accidentally
- [ ] No token/secret values rendered in any row
