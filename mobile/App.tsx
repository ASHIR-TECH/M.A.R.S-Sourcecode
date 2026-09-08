import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { RootNavigator } from './src/navigation/RootNavigator';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const handleSplashFinished = () => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSplash(false);
      }
    });
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: contentOpacity }]}>
        <RootNavigator />
      </Animated.View>
      {showSplash ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
          <SplashScreen onFinished={handleSplashFinished} />
        </Animated.View>
      ) : null}
    </View>
  );
}