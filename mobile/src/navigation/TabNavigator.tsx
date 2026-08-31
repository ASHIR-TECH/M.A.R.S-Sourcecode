import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TAB_CONFIG } from './tabConfig';
import { tabBarOptions } from './TabNavigator.styles';
import { AnimatedTabBar } from './AnimatedTabBar';
import { AppBackground } from '../components/AppBackground';
import { ConnectionStatusBanner } from '../components/ConnectionStatusBanner';
import { useRelayConnection } from '../relay/useRelayConnection';

const Tab = createBottomTabNavigator();

function RelayConnectionProvider({ children }: { children: React.ReactNode }) {
  // Opens the WS connection to the paired desktop once authenticated. It also
  // writes inbound state/chat messages into the stores (PHASE_6).
  useRelayConnection();
  return <>{children}</>;
}

/**
 * Phase 4 standard bottom tab bar. Fully config-driven from TAB_CONFIG so the
 * tab bar and the GestureFAB (when that phase lands) share one canonical
 * route graph — the tab bar is the zero-learning-curve path to every tab.
 */
export function TabNavigator() {
  return (
    <RelayConnectionProvider>
      <AppBackground>
        <View style={styles.root}>
          <ConnectionStatusBanner />
          <View style={styles.flex}>
            <Tab.Navigator screenOptions={tabBarOptions} tabBar={(props) => <AnimatedTabBar {...props} />}>
              {TAB_CONFIG.map(({ name, component }) => (
                <Tab.Screen key={name} name={name} component={component} />
              ))}
            </Tab.Navigator>
          </View>
        </View>
      </AppBackground>
    </RelayConnectionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});