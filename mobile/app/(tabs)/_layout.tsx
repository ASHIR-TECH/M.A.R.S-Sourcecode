import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { TabIcon } from '@/components/TabIcon';
import { colors, FONTS } from '@/constants/brand';

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.text,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'HOME',
            tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="devices"
          options={{
            title: 'DEVICES',
            tabBarIcon: ({ color }) => <TabIcon name="smartphone" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'CHAT',
            tabBarIcon: ({ color }) => <TabIcon name="message" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'SETTINGS',
            tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
    height: 78,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tabLabel: {
    fontFamily: FONTS.jetbrains,
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
