import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';

const orbHtml = require('../assets/orb-background.html');

const WebViewComponent = Platform.OS === 'web' ? null : require('react-native-webview').WebView;

/**
 * Full-screen animated orb backdrop rendered from the bundled HTML scene.
 * Sits behind every screen in the app (mounted once in the root layout).
 */
export function OrbBackground() {
  if (Platform.OS === 'web') {
    return <View style={styles.fill} testID="orb-background-web" />;
  }

  const uri = Asset.fromModule(orbHtml).uri;

  return (
    <WebViewComponent
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      testID="orb-background"
      scrollEnabled={false}
      overScrollMode="never"
      bounces={false}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      originWhitelist={['*']}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0400',
  },
});
