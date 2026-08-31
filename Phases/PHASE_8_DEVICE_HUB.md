# Phase 8 — Device Hub Screen

**Module:** `screens/DeviceHub`
**Depends on:** Phase 3 (`useDeviceStore`, `DeviceCard` pattern), Phase 6 (live relay data)
**Blocks:** FAB's "overflow chevron → All Peers" target resolves here (per Phase 4's parity requirement)

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Header: back button, "DEVICE HUB" title, add-device button (→ QR Scanner, Phase 5) |
| FR-2 | Collection tabs: Work Servers / Home Lab / Clients, each with a count badge, matching Figma `mars-device-hub` |
| FR-3 | "Deployed Nodes" section header with live count |
| FR-4 | Grid of node cards (2-column): OS, name, status pill, CPU % + bar, RAM % + bar, last-check time |
| FR-5 | Tapping a node card opens node detail (stub target — deferred) |
| FR-6 | This screen **is** the FAB's "All Peers" destination — filtered to show all nodes when reached via the overflow chevron (per Phase 4 parity rule) |
| FR-7 | Collections are user-defined groupings of devices — v1 ships with the 3 seen in Figma as mock groups; add/edit/delete collection is deferred |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Node data model extends Phase 3's `Device` type — cpu/ram are additive fields, not a redefinition, so Phase 6 relay hydration keeps working unchanged |
| NFR-2 | Grid uses `FlatList` with `numColumns={2}`, not nested `ScrollView`s, for scroll performance |
| NFR-3 | Progress bars are pure presentational components, no logic — reusable anywhere a percentage needs a bar |

---

## 2. Design Decisions

- **Extend, don't replace, `Device`.** Phase 3 defined `{ id, name, os, status, lastSeen }`. This phase adds `cpu: number`, `ram: number`, `collectionId: string` as optional/extended fields on the same interface (`DeviceWithMetrics extends Device`), so the relay contract from Phase 6 doesn't need to change — it can send the fuller shape and Home (which only reads the base fields) keeps working untouched.
- **Collections as client-side grouping**, not separate store objects, for v1 — a `collectionId` field on each device, with tab filtering done in a selector. Simpler than a normalized collections store, and enough for the Figma requirement.

---

## 3. File Structure

```
src/
  types/
    device.ts                      # MODIFIED: adds DeviceWithMetrics
  components/
    NodeCard.tsx
    ProgressBar.tsx
    CollectionTab.tsx
  screens/
    DeviceHub/
      DeviceHubScreen.tsx
      DeviceHubScreen.styles.ts
      deviceHubSelectors.ts
      deviceHubSelectors.test.ts
```

---

## 4. Implementation

### 4.1 Extended type

```ts
// src/types/device.ts (addition)
import { Device } from './device';

export interface DeviceWithMetrics extends Device {
  cpu: number;      // 0-100
  ram: number;      // 0-100
  collectionId: string;
}
```

### 4.2 Pure selectors (filter logic, testable without rendering)

```ts
// src/screens/DeviceHub/deviceHubSelectors.ts
import { DeviceWithMetrics } from '../../types/device';

export interface Collection {
  id: string;
  label: string;
}

export const COLLECTIONS: Collection[] = [
  { id: 'work-servers', label: 'Work Servers' },
  { id: 'home-lab', label: 'Home Lab' },
  { id: 'clients', label: 'Clients' },
];

export function devicesInCollection(
  devices: DeviceWithMetrics[],
  collectionId: string
): DeviceWithMetrics[] {
  return devices.filter((d) => d.collectionId === collectionId);
}

export function countForCollection(devices: DeviceWithMetrics[], collectionId: string): number {
  return devicesInCollection(devices, collectionId).length;
}
```

### 4.3 Progress bar

```tsx
// src/components/ProgressBar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ProgressBarProps {
  percent: number; // 0-100
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
});
```

### 4.4 Node card

```tsx
// src/components/NodeCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DeviceWithMetrics } from '../types/device';
import { StatusPill } from './StatusPill';
import { ProgressBar } from './ProgressBar';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface NodeCardProps {
  node: DeviceWithMetrics;
  onPress?: (node: DeviceWithMetrics) => void;
}

export function NodeCard({ node, onPress }: NodeCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(node)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${node.name}, ${node.status}, CPU ${node.cpu}%, RAM ${node.ram}%`}
    >
      <View style={styles.topRow}>
        <Text style={styles.os}>{node.os}</Text>
        <StatusPill status={node.status} />
      </View>
      <Text style={styles.name}>{node.name}</Text>

      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>CPU</Text>
        <Text style={styles.metricValue}>{node.cpu}%</Text>
      </View>
      <ProgressBar percent={node.cpu} />

      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>RAM</Text>
        <Text style={styles.metricValue}>{node.ram}%</Text>
      </View>
      <ProgressBar percent={node.ram} />

      <Text style={styles.lastCheck}>Last check  {node.lastSeen}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  os: { color: colors.textMuted, fontSize: 11 },
  name: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: spacing.xs },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  metricLabel: { color: colors.textMuted, fontSize: 10 },
  metricValue: { color: colors.textMuted, fontSize: 10 },
  lastCheck: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm },
});
```

### 4.5 Collection tab

```tsx
// src/components/CollectionTab.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface CollectionTabProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}

export function CollectionTab({ label, count, active, onPress }: CollectionTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      <Text style={[styles.count, active && styles.labelActive]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: { backgroundColor: colors.accent },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  count: { color: colors.textMuted, fontSize: 13 },
  labelActive: { color: '#0B0704' },
});
```

### 4.6 Device Hub screen

```tsx
// src/screens/DeviceHub/DeviceHubScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useDeviceStore } from '../../store/useDeviceStore';
import { NodeCard } from '../../components/NodeCard';
import { CollectionTab } from '../../components/CollectionTab';
import { COLLECTIONS, devicesInCollection, countForCollection } from './deviceHubSelectors';
import { DeviceWithMetrics } from '../../types/device';
import { styles } from './DeviceHubScreen.styles';

interface DeviceHubScreenProps {
  /** When true (FAB overflow entry point), shows all devices, ignoring collection tabs. */
  showAllPeers?: boolean;
  onAddDevice: () => void;
  onNodePress: (node: DeviceWithMetrics) => void;
  onBack: () => void;
}

export function DeviceHubScreen({ showAllPeers, onAddDevice, onNodePress, onBack }: DeviceHubScreenProps) {
  const devices = useDeviceStore((s) => s.devices) as DeviceWithMetrics[];
  const [activeCollection, setActiveCollection] = useState(COLLECTIONS[0].id);

  const visibleDevices = showAllPeers ? devices : devicesInCollection(devices, activeCollection);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text onPress={onBack} style={styles.back}>{'←'}</Text>
        <Text style={styles.title}>DEVICE HUB</Text>
        <Text onPress={onAddDevice} style={styles.add}>{'+'}</Text>
      </View>

      {!showAllPeers && (
        <FlatList
          horizontal
          data={COLLECTIONS}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          renderItem={({ item }) => (
            <CollectionTab
              label={item.label}
              count={countForCollection(devices, item.id)}
              active={activeCollection === item.id}
              onPress={() => setActiveCollection(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        />
      )}

      <Text style={styles.sectionLabel}>
        {showAllPeers ? 'All Connected Peers' : 'Deployed Nodes'} ({visibleDevices.length})
      </Text>

      <FlatList
        data={visibleDevices}
        keyExtractor={(d) => d.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <NodeCard node={item} onPress={onNodePress} />}
      />
    </View>
  );
}
```

### 4.7 Styles

```ts
// src/screens/DeviceHub/DeviceHubScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  back: { color: colors.textPrimary, fontSize: 20 },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, letterSpacing: 1 },
  add: { color: colors.accent, fontSize: 22 },
  tabRow: { marginBottom: spacing.md },
  sectionLabel: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, textTransform: 'uppercase' },
  grid: { gap: spacing.sm },
  row: { gap: spacing.sm },
});
```

---

## 5. Testing

```ts
// src/screens/DeviceHub/deviceHubSelectors.test.ts
import { devicesInCollection, countForCollection } from './deviceHubSelectors';
import { DeviceWithMetrics } from '../../types/device';

const devices: DeviceWithMetrics[] = [
  { id: '1', name: 'A', os: 'Linux', status: 'online', lastSeen: 'now', cpu: 10, ram: 20, collectionId: 'work-servers' },
  { id: '2', name: 'B', os: 'Windows', status: 'idle', lastSeen: '5m', cpu: 30, ram: 40, collectionId: 'home-lab' },
  { id: '3', name: 'C', os: 'Linux', status: 'online', lastSeen: '1m', cpu: 15, ram: 25, collectionId: 'work-servers' },
];

describe('devicesInCollection', () => {
  it('filters correctly by collectionId', () => {
    expect(devicesInCollection(devices, 'work-servers')).toHaveLength(2);
  });
  it('returns empty for a collection with no members', () => {
    expect(devicesInCollection(devices, 'clients')).toHaveLength(0);
  });
});

describe('countForCollection', () => {
  it('matches devicesInCollection length', () => {
    expect(countForCollection(devices, 'home-lab')).toBe(1);
  });
});
```

**Manual QA checklist:**
- [ ] Collection tabs filter the grid correctly, counts match
- [ ] `showAllPeers` mode (FAB entry) hides tabs and shows every device
- [ ] Progress bars render correctly at 0%, 50%, 100%, and clamp beyond 100
- [ ] Grid scrolls smoothly with 20+ mock devices

---

## 6. Acceptance Criteria

- [ ] Matches Figma `mars-device-hub` layout
- [ ] `DeviceWithMetrics` extends Phase 3's `Device` without breaking Home screen
- [ ] Serves as the actual FAB overflow destination (Phase 4 parity requirement satisfied)
- [ ] Selectors are pure and unit tested
