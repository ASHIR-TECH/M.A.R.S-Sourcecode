import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TAB_CONFIG } from './tabConfig';
import { tabBarOptions } from './TabNavigator.styles';
import { AppBackground } from '../components/AppBackground';

const Tab = createBottomTabNavigator();

/**
 * Phase 4 standard bottom tab bar. Fully config-driven from TAB_CONFIG so the
 * tab bar and the GestureFAB (when that phase lands) share one canonical
 * route graph — the tab bar is the zero-learning-curve path to every tab.
 */
export function TabNavigator() {
  return (
    <AppBackground>
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
    </AppBackground>
  );
}