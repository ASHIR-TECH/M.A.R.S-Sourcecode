import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/Home/HomeScreen';
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
