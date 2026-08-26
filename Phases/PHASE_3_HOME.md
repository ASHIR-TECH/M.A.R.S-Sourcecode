# Phase 3 — Home / Command Center Screen

**Module:** `screens/Home`
**Depends on:** Phase 1 (theme, `MarsLogo`), Phase 2 (auth session — screen is behind the authenticated stack), mock data layer (no relay yet)
**Blocks:** Bottom tab navigator wiring (this is the first tab's content); later phases swap mock data for live relay data without changing this screen's structure

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Screen shows header (logo, "COMMAND CENTER" title, "SECURE CONNECTION ACTIVE" subtitle, avatar badge) |
| FR-2 | Search bar with placeholder "Search active systems or peers…" |
| FR-3 | "Connected Devices" section: section header + live count badge (e.g. "2/2 ON"), horizontally arranged device cards |
| FR-4 | Each device card shows: device ID, status pill (online/idle/offline), name, OS/subtitle, "Active" label, last-seen time |
| FR-5 | "Recent Chats" section: list of chat preview rows — avatar initials, name, timestamp, last message snippet, unread badge if applicable |
| FR-6 | Bottom tab bar: Home, Devices, Chat, Settings — icons + labels, active tab highlighted |
| FR-7 | Tapping a device card navigates to that device's detail (stub navigation call for now — Device Hub not yet built) |
| FR-8 | Tapping a chat row navigates to the Chat screen (stub navigation call for now) |
| FR-9 | Search input filters the visible device list client-side by name/id (chats unaffected in v1) |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Screen renders entirely from a typed mock dataset — zero network calls |
| NFR-2 | Data shape matches what the future relay payload will look like, so swapping mock→live later is a store change, not a screen rewrite |
| NFR-3 | List rendering (`FlatList`) is used for both device cards and chat rows — not `.map` in a `ScrollView` — so it scales once real data grows |
| NFR-4 | Screen re-renders efficiently on search input change (no unnecessary re-renders of unaffected rows) |

### 1.3 Out of Scope (deferred)
- Live device status updates (relay-dependent — later phase)
- Real chat message content / AI Co-Pilot wiring (Phase for Chat screen)
- Device Hub deep content (Phase 4, if chosen next)
- Push notification badge sync

---

## 2. Architecture & Design Decisions

### 2.1 Mock data shaped like the future contract
Rather than inventing a throwaway shape, `mockDevices.ts` and `mockChats.ts` are typed against the **same interfaces** the relay will eventually populate (`Device`, `ChatPreview`). This means Phase "wire to relay" later becomes: replace `useDeviceStore`'s mock initializer with a WebSocket subscription — the `HomeScreen` component itself needs zero changes.

```ts
interface Device {
  id: string;
  name: string;
  os: string;
  status: 'online' | 'idle' | 'offline';
  lastSeen: string; // ISO string or relative label pre-formatted for v1
}

interface ChatPreview {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}
```

### 2.2 Store now, even without a backend
`useDeviceStore` and `useChatStore` (zustand) are introduced in this phase — initialized with mock data — rather than passing data as static props. This avoids a rewrite later: the screen already reads from the store, so plugging in live updates is additive, not structural.

### 2.3 Component decomposition
Each visual block becomes its own component so Device Hub (Phase 4) can reuse `DeviceCard` and Chat screen can reuse chat-row rendering:
- `SearchBar`
- `DeviceCard` (compact variant for Home; Device Hub gets a fuller variant later)
- `ChatPreviewRow`
- `StatusPill`
- `SectionHeader` (label + trailing badge/count, reused across sections)
- `BottomTabBar` (if not already produced by `@react-navigation/bottom-tabs` styling — see §2.4)

### 2.4 Navigation shell decision
Use `@react-navigation/bottom-tabs` rather than a hand-rolled tab bar. It's the standard, accessible, gesture-correct choice, and it's already a natural fit since `@react-navigation/native` is already a dependency. Styling is customized via `tabBarStyle`/`tabBarIcon` to match the Figma amber-highlight look, rather than building tab logic from scratch.

---

## 3. File Structure

```
src/
  types/
    device.ts                     # Device interface
    chat.ts                        # ChatPreview interface
  data/
    mockDevices.ts
    mockChats.ts
  store/
    useDeviceStore.ts
    useChatStore.ts
  components/
    SearchBar.tsx
    SectionHeader.tsx
    StatusPill.tsx
    DeviceCard.tsx
    ChatPreviewRow.tsx
  screens/
    Home/
      HomeScreen.tsx
      HomeScreen.styles.ts
      HomeScreen.test.tsx
  navigation/
    TabNavigator.tsx               # bottom tabs: Home, Devices, Chat, Settings
    TabNavigator.styles.ts
App.tsx (unchanged from Phase 2, now routes into TabNavigator post-auth)
```

---

## 4. Dependencies

```bash
npm install @react-navigation/bottom-tabs
npx expo install react-native-safe-area-context react-native-screens
npm install zustand   # already installed if Phase 2 done
```

---

## 5. Implementation

### 5.1 Types

```ts
// src/types/device.ts
export type DeviceStatus = 'online' | 'idle' | 'offline';

export interface Device {
  id: string;
  name: string;
  os: string;
  status: DeviceStatus;
  lastSeen: string; // pre-formatted relative label, e.g. "Just Now", "14m ago"
}
```

```ts
// src/types/chat.ts
export interface ChatPreview {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}
```

### 5.2 Mock data

```ts
// src/data/mockDevices.ts
import { Device } from '../types/device';

export const mockDevices: Device[] = [
  {
    id: 'DEV-091',
    name: 'CONTRACTOR',
    os: 'Kali Linux',
    status: 'online',
    lastSeen: 'Just Now',
  },
  {
    id: 'DEV-022',
    name: 'WORK-LAPTOP',
    os: 'Windows 11 Pro',
    status: 'idle',
    lastSeen: '14m ago',
  },
];
```

```ts
// src/data/mockChats.ts
import { ChatPreview } from '../types/chat';

export const mockChats: ChatPreview[] = [
  {
    id: 'chat-nova-core',
    name: 'Nova Core',
    initials: 'NC',
    lastMessage: 'Alert: Node CPU spike detected…',
    timestamp: '14:02',
    unreadCount: 1,
  },
  {
    id: 'chat-helix',
    name: 'Helix (Lead Dev)',
    initials: 'HX',
    lastMessage: 'The local sync command compl…',
    timestamp: 'Yesterday',
    unreadCount: 0,
  },
];
```

### 5.3 Stores

```ts
// src/store/useDeviceStore.ts
import { create } from 'zustand';
import { Device } from '../types/device';
import { mockDevices } from '../data/mockDevices';

interface DeviceState {
  devices: Device[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredDevices: () => Device[];
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: mockDevices, // TODO(relay): replace with live subscription in a later phase
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  filteredDevices: () => {
    const { devices, searchQuery } = get();
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    );
  },
}));
```

```ts
// src/store/useChatStore.ts
import { create } from 'zustand';
import { ChatPreview } from '../types/chat';
import { mockChats } from '../data/mockChats';

interface ChatState {
  chats: ChatPreview[];
}

export const useChatStore = create<ChatState>(() => ({
  chats: mockChats, // TODO(backend): replace with live chat history in a later phase
}));
```

### 5.4 Shared components

```tsx
// src/components/StatusPill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceStatus } from '../types/device';

const STATUS_CONFIG: Record<DeviceStatus, { label: string; color: string }> = {
  online: { label: 'ONLINE', color: '#4CD964' },
  idle: { label: 'IDLE', color: '#E8A34D' },
  offline: { label: 'OFFLINE', color: '#8A7A68' },
};

export function StatusPill({ status }: { status: DeviceStatus }) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});
```

```tsx
// src/components/SearchBar.tsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Search active systems or peers"
        accessibilityRole="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
```

```tsx
// src/components/SectionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SectionHeaderProps {
  title: string;
  badge?: string;
}

export function SectionHeader({ title, badge }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
});
```

```tsx
// src/components/DeviceCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Device } from '../types/device';
import { StatusPill } from './StatusPill';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
}

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${device.status}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.id}>{device.id}</Text>
        <StatusPill status={device.status} />
      </View>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={styles.os}>{device.os}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.metaLabel}>Active</Text>
        <Text style={styles.metaValue}>{device.lastSeen}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    width: 160,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: colors.textMuted, fontSize: 11 },
  name: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginTop: spacing.xs },
  os: { color: colors.textMuted, fontSize: 12 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: colors.textMuted, fontSize: 11 },
  metaValue: { color: colors.textMuted, fontSize: 11 },
});
```

```tsx
// src/components/ChatPreviewRow.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChatPreview } from '../types/chat';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface ChatPreviewRowProps {
  chat: ChatPreview;
  onPress?: (chat: ChatPreview) => void;
}

export function ChatPreviewRow({ chat, onPress }: ChatPreviewRowProps) {
  return (
    <Pressable
      onPress={() => onPress?.(chat)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${chat.name}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{chat.initials}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.timestamp}>{chat.timestamp}</Text>
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>
      {chat.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{chat.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  timestamp: { color: colors.textMuted, fontSize: 11 },
  message: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: '#0B0704', fontSize: 11, fontWeight: '700' },
});
```

### 5.5 The Home screen

```tsx
// src/screens/Home/HomeScreen.tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useChatStore } from '../../store/useChatStore';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { SearchBar } from '../../components/SearchBar';
import { SectionHeader } from '../../components/SectionHeader';
import { DeviceCard } from '../../components/DeviceCard';
import { ChatPreviewRow } from '../../components/ChatPreviewRow';
import { Device } from '../../types/device';
import { ChatPreview } from '../../types/chat';
import { styles } from './HomeScreen.styles';

interface HomeScreenProps {
  onDevicePress?: (device: Device) => void;
  onChatPress?: (chat: ChatPreview) => void;
}

export function HomeScreen({ onDevicePress, onChatPress }: HomeScreenProps) {
  const { searchQuery, setSearchQuery, filteredDevices, devices } = useDeviceStore();
  const { chats } = useChatStore();

  const visibleDevices = filteredDevices();
  const onlineCount = devices.filter((d) => d.status !== 'offline').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MarsLogo size={32} />
          <View>
            <Text style={styles.title}>COMMAND CENTER</Text>
            <Text style={styles.subtitle}>SECURE CONNECTION ACTIVE</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>OP</Text>
        </View>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search active systems or peers…"
      />

      <View style={styles.section}>
        <SectionHeader title="Connected Devices" badge={`${onlineCount}/${devices.length} ON`} />
        <FlatList
          horizontal
          data={visibleDevices}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deviceListContent}
          renderItem={({ item }) => <DeviceCard device={item} onPress={onDevicePress} />}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent Chats" />
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatPreviewRow chat={item} onPress={onChatPress} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      </View>
    </View>
  );
}
```

### 5.6 Styles

```ts
// src/screens/Home/HomeScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  subtitle: { color: colors.textMuted, fontSize: 10, letterSpacing: 0.5 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  section: { gap: spacing.sm },
  deviceListContent: { paddingRight: spacing.lg },
});
```

### 5.7 Tab navigator

```tsx
// src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/Home/HomeScreen';
// Devices / Chat / Settings screens are stubbed until their own phases exist.
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

function StubScreen({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textPrimary }}>{label} — coming in a later phase</Text>
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: 'rgba(255,255,255,0.08)' },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices">{() => <StubScreen label="Devices" />}</Tab.Screen>
      <Tab.Screen name="Chat">{() => <StubScreen label="Chat" />}</Tab.Screen>
      <Tab.Screen name="Settings">{() => <StubScreen label="Settings" />}</Tab.Screen>
    </Tab.Navigator>
  );
}
```

---

## 6. Testing

```ts
// src/screens/Home/HomeScreen.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useDeviceStore } from '../../store/useDeviceStore';

describe('useDeviceStore.filteredDevices', () => {
  beforeEach(() => {
    useDeviceStore.setState({ searchQuery: '' });
  });

  it('returns all devices when search query is empty', () => {
    const { result } = renderHook(() => useDeviceStore());
    expect(result.current.filteredDevices()).toHaveLength(result.current.devices.length);
  });

  it('filters devices by name, case-insensitive', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('contractor'));
    expect(result.current.filteredDevices()).toHaveLength(1);
    expect(result.current.filteredDevices()[0].name).toBe('CONTRACTOR');
  });

  it('filters devices by id', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('dev-022'));
    expect(result.current.filteredDevices()[0].id).toBe('DEV-022');
  });

  it('returns empty array when nothing matches', () => {
    const { result } = renderHook(() => useDeviceStore());
    act(() => result.current.setSearchQuery('nonexistent'));
    expect(result.current.filteredDevices()).toHaveLength(0);
  });
});
```

**Manual QA checklist:**
- [ ] Header, search bar, device cards, chat rows all match Figma frame `mars-home-default`
- [ ] Typing in search filters device cards live, no lag
- [ ] Horizontal device list scrolls smoothly with more than 2 mock devices (test by adding extra mock entries temporarily)
- [ ] Chat rows show unread badge only when `unreadCount > 0`
- [ ] Bottom tabs render with correct icons/labels and active-tab highlight color
- [ ] Tapping a device card or chat row calls the respective `onPress` handler (verify via console.log stub until real navigation targets exist)

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] Screen matches Figma frame `mars-home-default`
- [ ] All data is sourced from `useDeviceStore` / `useChatStore`, not hardcoded in the screen
- [ ] Search filters the device list correctly and is unit tested
- [ ] `DeviceCard` and `ChatPreviewRow` are standalone, reusable components with no Home-specific logic baked in
- [ ] Bottom tab bar is functional and styled to match the design (Devices/Chat/Settings may be stub screens)
- [ ] No network calls exist anywhere in this phase
- [ ] Data types (`Device`, `ChatPreview`) are written to match the anticipated relay payload shape, confirmed by inline `TODO(relay)` / `TODO(backend)` comments marking future swap points
