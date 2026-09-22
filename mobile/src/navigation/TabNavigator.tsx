import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TAB_CONFIG, TabName } from './tabConfig';
import { AnimatedTabBar } from './AnimatedTabBar';
import { PagerTabView } from './PagerTabView';
import { TabBarVisibilityProvider } from './TabBarVisibility';
import { AppBackground } from '../components/AppBackground';
import { ConnectionStatusBanner } from '../components/ConnectionStatusBanner';
import { RelayConnectionProvider } from '../relay/RelayConnectionContext';

/**
 * Phase 4 tab shell. Fully config-driven from TAB_CONFIG: the bottom bar and
 * the drag-follow pager share the same route order, so reordering or adding a
 * tab stays a data change. Swiping horizontally anywhere on the page moves to
 * the adjacent tab (WebView-style), and the bar reflects the settled index.
 */
export function TabNavigator() {
  const [index, setIndex] = useState(0);
  const [tabBarHidden, setTabBarHidden] = useState(false);

  const selectTab = useCallback((name: TabName) => {
    const next = TAB_CONFIG.findIndex((tab) => tab.name === name);
    if (next >= 0) setIndex(next);
  }, []);

  return (
    <RelayConnectionProvider>
      <AppBackground>
        <View style={styles.root}>
          <ConnectionStatusBanner />
          <TabBarVisibilityProvider setHidden={setTabBarHidden}>
            <View style={styles.flex}>
              <PagerTabView index={index} onIndexChange={setIndex} />
              <AnimatedTabBar activeIndex={index} onSelect={selectTab} hidden={tabBarHidden} />
            </View>
          </TabBarVisibilityProvider>
        </View>
      </AppBackground>
    </RelayConnectionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
