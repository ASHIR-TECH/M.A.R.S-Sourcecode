# Phase 4 — Bottom Navigation Bar (Standard Tab Bar)

**Module:** `navigation/TabNavigator`
**Depends on:** Phase 1 (theme), Phase 3 (Home screen as first tab)
**Coexists with:** the Gesture FAB (`PHASE_GESTURE_FAB.md`) — this is not a replacement, it's a parallel, conventional path to the same destinations
**Blocks:** Nothing structurally — Devices/Chat/Settings tabs currently point to stub screens until their own phases exist

---

## 1. Why this phase exists alongside the FAB

The gesture FAB is a novel interaction — it's fast and satisfying once learned, but it is **not** a pattern most users have encountered before. Novel gestures always carry a discoverability cost: some users won't find them, some won't trust them, some just want the thing that looks like every other app.

This is where **Jakob's Law** applies directly: *users spend most of their time on other apps, and they prefer your app to work the same way as the ones they already know.* A bottom tab bar with fixed icons and labels is one of the most learned UI patterns in mobile software — nobody has to discover it, guess at it, or be taught it. It just works the way they expect.

So the design position for this phase is deliberate: **the tab bar is the default, guaranteed, zero-learning-curve path. The FAB is an accelerator layered on top for users who want it.** Neither is secondary — they're two routes to the same navigation graph, serving two different user expectations. A user who never touches the FAB in their entire time using the app should still be able to reach every primary destination through the tab bar alone.

---

## 2. Requirements

### 2.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Bottom tab bar with 4 fixed tabs: Home, Devices, Chat, Settings — always visible on primary screens, matching the icon/label layout already shown in the Figma frames |
| FR-2 | Active tab is visually distinguished (icon + label color change to accent) |
| FR-3 | Tapping a tab navigates to that tab's screen; tapping the already-active tab is a no-op (does not reset scroll/state) unless double-tapped, which is standard "scroll to top" behavior |
| FR-4 | Tab bar persists across all 4 primary screens with no flicker/remount between switches |
| FR-5 | Every destination reachable via the FAB (Chat, Devices/All-Peers) must also be reachable via the tab bar — no FAB-exclusive destinations |
| FR-6 | Tab bar and FAB do not visually or functionally conflict — FAB floats above the tab bar, never obscures active tab labels, and both can be used interchangeably in the same session without desync |

### 2.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Built on `@react-navigation/bottom-tabs` — the standard, accessible, platform-idiomatic navigation primitive, not a custom-built tab bar. This is itself an application of Jakob's Law at the implementation level: don't reinvent a solved, expected interaction. |
| NFR-2 | Respects platform convention: iOS gets the translucent/blur-adjacent styling users expect from iOS tab bars where feasible; Android follows Material tab bar conventions. Full platform-native chrome is not required, but the *shape* of the pattern (icons+labels, bottom-fixed, active-state highlight) must not deviate from what both platforms' users already expect. |
| NFR-3 | Navigation state (active tab, per-tab navigation stack) survives app backgrounding/foregrounding |
| NFR-4 | Icons + labels meet accessibility contrast minimums against the background |
| NFR-5 | Tab bar height and safe-area handling correctly account for iOS home indicator / Android gesture nav |

### 2.3 Out of Scope (deferred)
- Devices, Chat, and Settings screen *content* — those are separate phases; this phase only wires the navigation shell and stub targets
- Badge counts on tabs (e.g. unread chat count on the Chat tab icon) — flagged as a natural fast-follow once Chat's data model exists, not required for this phase's DoD

---

## 3. Design Decisions (Jakob's Law applied concretely)

| Decision point | Choice | Why (Jakob's Law reasoning) |
|---|---|---|
| Tab bar library | `@react-navigation/bottom-tabs` | The de facto standard for RN — same underlying interaction model as native iOS `UITabBarController` and Android's `BottomNavigationView`. Users' mental model transfers instantly. |
| Number of tabs | 4, fixed | Most mainstream apps (Instagram, Spotify, banking apps) converge on 4–5 bottom tabs. Matches user expectation for "how many things live down there." |
| Icon + label together | Always both, never icon-only | Icon-only tab bars require users to learn unfamiliar iconography; icon+label is the safer, more universally legible default and what most users already expect from apps like this. |
| Active state signal | Color change (icon + label to accent), not shape change | Color-shift-on-active is the most common convention; avoids inventing a new visual language the user has to learn. |
| Relationship to the FAB | FAB is additive, never required | If the FAB were the *only* path to a destination, we'd be forcing every user through a novel gesture just to reach a primary feature — directly against Jakob's Law. The tab bar guarantees the familiar fallback always exists. |

---

## 4. File Structure

```
src/
  navigation/
    TabNavigator.tsx              # already scaffolded in Phase 3 — this phase finalizes it
    TabNavigator.styles.ts
    tabConfig.ts                   # NEW: tab metadata as data, not inline JSX
  components/
    icons/
      HomeTabIcon.tsx
      DevicesTabIcon.tsx
      ChatTabIcon.tsx
      SettingsTabIcon.tsx
  screens/
    Devices/
      DevicesScreen.tsx             # stub — real content deferred
    Chat/
      ChatScreen.tsx                 # stub — real content deferred
    Settings/
      SettingsScreen.tsx             # stub — real content deferred
```

---

## 5. Implementation

### 5.1 Tab config as data

Same principle applied in the FAB segments doc: tab metadata lives in one config array, not scattered inline JSX, so adding a badge or reordering tabs later is a data change, not a structural one.

```ts
// src/navigation/tabConfig.ts
import { ComponentType } from 'react';
import { HomeTabIcon } from '../components/icons/HomeTabIcon';
import { DevicesTabIcon } from '../components/icons/DevicesTabIcon';
import { ChatTabIcon } from '../components/icons/ChatTabIcon';
import { SettingsTabIcon } from '../components/icons/SettingsTabIcon';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { DevicesScreen } from '../screens/Devices/DevicesScreen';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

export interface TabConfig {
  name: 'Home' | 'Devices' | 'Chat' | 'Settings';
  label: string;
  icon: ComponentType<{ color: string; focused: boolean }>;
  component: ComponentType<any>;
}

export const TAB_CONFIG: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: HomeTabIcon, component: HomeScreen },
  { name: 'Devices', label: 'Devices', icon: DevicesTabIcon, component: DevicesScreen },
  { name: 'Chat', label: 'Chat', icon: ChatTabIcon, component: ChatScreen },
  { name: 'Settings', label: 'Settings', icon: SettingsTabIcon, component: SettingsScreen },
];
```

### 5.2 The tab navigator

```tsx
// src/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TAB_CONFIG } from './tabConfig';
import { tabBarOptions } from './TabNavigator.styles';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      {TAB_CONFIG.map(({ name, label, icon: Icon, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, focused }) => <Icon color={color} focused={focused} />,
            tabBarAccessibilityLabel: label,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
```

### 5.3 Styling (platform-conventional, per NFR-2)

```ts
// src/navigation/TabNavigator.styles.ts
import { Platform } from 'react-native';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.background,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8, // safe-area allowance, see NFR-5
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBarHideOnKeyboard: Platform.OS === 'android',
};
```

### 5.4 Example tab icon (pattern to repeat for the other three)

```tsx
// src/components/icons/HomeTabIcon.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabIconProps {
  color: string;
  focused: boolean;
}

export function HomeTabIcon({ color }: TabIconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11L12 3L21 11V20A1 1 0 0 1 20 21H15V14H9V21H4A1 1 0 0 1 3 20V11Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
```

> Repeat this pattern for `DevicesTabIcon`, `ChatTabIcon`, `SettingsTabIcon` using your actual icon set/exported SVG paths — structure shown here is the placeholder to replace, matching the same convention used for `MarsLogo` in Phase 1.

### 5.5 Stub screens (until their own phases exist)

```tsx
// src/screens/Devices/DevicesScreen.tsx  (same pattern for Chat/Settings)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export function DevicesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Devices — coming in a later phase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textPrimary },
});
```

### 5.6 Coexistence with the FAB (root wiring)

This confirms FR-6 structurally: the FAB is mounted as a sibling overlay above the tab navigator, not inside any individual tab screen, so it floats consistently regardless of which tab is active, and never gets confused with tab-bar navigation state.

```tsx
// src/navigation/RootNavigator.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TabNavigator } from './TabNavigator';
import { GestureFAB } from '../components/GestureFAB/GestureFAB';

export function RootNavigator() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TabNavigator />
      <GestureFAB
        onCameraPress={() => {}}
        onMenuPress={() => {}}
        onChatPress={() => {/* navigate to Chat tab, e.g. navigationRef.navigate('Chat') */}}
        onOverflowPress={() => {/* navigate to All Peers, nested under Devices tab */}}
        onPeerAvatarPress={(peerId) => {/* navigate to peer detail */}}
      />
    </GestureHandlerRootView>
  );
}
```

**Parity note (enforces FR-5):** `onChatPress` on the FAB and the Chat tab must resolve to the exact same screen/route — not two different implementations of "chat." Same for the FAB's overflow chevron and however the Devices tab exposes an "All Peers" view once that phase exists. Keep one canonical route per destination; both the FAB and the tab bar just call into it.

---

## 6. Testing

```ts
// src/navigation/tabConfig.test.ts
import { TAB_CONFIG } from './tabConfig';

describe('TAB_CONFIG', () => {
  it('has exactly 4 tabs', () => {
    expect(TAB_CONFIG).toHaveLength(4);
  });

  it('has unique tab names', () => {
    const names = TAB_CONFIG.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every tab has an icon and a component defined', () => {
    TAB_CONFIG.forEach((tab) => {
      expect(tab.icon).toBeDefined();
      expect(tab.component).toBeDefined();
    });
  });

  it('matches the expected order: Home, Devices, Chat, Settings', () => {
    expect(TAB_CONFIG.map((t) => t.name)).toEqual(['Home', 'Devices', 'Chat', 'Settings']);
  });
});
```

**Manual QA checklist:**
- [ ] All 4 tabs visible and tappable with zero prior explanation needed (hand the app to someone unfamiliar with it — they should navigate correctly on first try, which is the practical test of Jakob's Law)
- [ ] Active tab clearly distinguished by color on both iOS and Android
- [ ] Tab bar respects safe area — no overlap with home indicator (iOS) or gesture bar (Android)
- [ ] Switching tabs is instant, no flicker or screen remount artifacts
- [ ] FAB remains visible and functional above the tab bar on every tab
- [ ] Reaching "Chat" via the tab bar and via the FAB's chat icon lands on the identical screen/state
- [ ] Reaching "All Peers"-equivalent via the tab bar (once Devices phase exists) and via the FAB's overflow chevron lands on the identical screen/state
- [ ] A user who never discovers/uses the FAB can complete every core task using only the tab bar

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] Bottom tab bar renders 4 fixed tabs (Home, Devices, Chat, Settings) using `@react-navigation/bottom-tabs`
- [ ] Tab metadata is defined once in `tabConfig.ts`, not duplicated inline
- [ ] Active/inactive states are visually distinct and meet accessibility contrast minimums
- [ ] Tab bar is platform-appropriate (safe-area correct on both iOS and Android)
- [ ] Every destination reachable via the FAB has an equivalent, identical-route path via the tab bar — verified explicitly in manual QA, not assumed
- [ ] FAB and tab bar are mounted independently and do not interfere with each other's state or hit-testing
- [ ] A first-time user with no app-specific instruction can navigate the full app using only the tab bar
