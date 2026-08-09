import React, { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { colours } from '@/constants/colours';
import { useAuth } from '@/contexts/AuthContext';
import { usePeers } from '@/contexts/PeerContext';
import { unread } from '@/lib/unread';

type IconProps = { color: string; size: number; focused: boolean };

function ChatTabIcon({ color, size }: IconProps) {
  const unreadCount = useSyncExternalStore(unread.subscribe, unread.get);
  return (
    <View>
      <Ionicons name="chatbubble-ellipses" size={size} color={color} />
      {unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PeersTabIcon({ color, size }: IconProps) {
  const { connectedCount } = usePeers();
  return (
    <View>
      <Ionicons name="git-network" size={size} color={color} />
      {connectedCount > 0 ? (
        <View style={[styles.peerBadge, { borderColor: colours.gold }]}>
          <Text style={styles.peerText}>{connectedCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AccountTabIcon({ color, size }: IconProps) {
  return <Ionicons name="person-circle" size={size} color={color} />;
}

/** Scales the icon to 0.92 for 80ms on press, then springs back. */
function AnimatedTabButton(props: BottomTabBarButtonProps) {
  const { onPress, onPressIn, onPressOut, children, style } = props;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.tabButton, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={(e) => {
          onPressIn?.(e);
          scale.value = withSpring(0.92, { stiffness: 300, damping: 20 });
        }}
        onPressOut={(e) => {
          onPressOut?.(e);
          scale.value = withSpring(1, { stiffness: 300, damping: 20 });
        }}
        style={[styles.tabButtonPressable, style]}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityRole={props.accessibilityRole}
        accessibilityState={props.accessibilityState}
        testID={props.testID}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colours.bgSurface,
          borderTopColor: colours.purpleDim,
          borderTopWidth: 1,
          height: 56,
        },
        tabBarActiveTintColor: colours.gold,
        tabBarInactiveTintColor: colours.purpleBright,
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Offside' },
        tabBarButton: AnimatedTabButton,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: (props) => <ChatTabIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="peers"
        options={{
          title: 'Peers',
          tabBarIcon: (props) => <PeersTabIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: (props) => <AccountTabIcon {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
  },
  tabButtonPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colours.ember,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadText: {
    color: colours.white,
    fontSize: 10,
    fontWeight: '700',
  },
  peerBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colours.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  peerText: {
    color: colours.gold,
    fontSize: 10,
    fontWeight: '700',
  },
});
