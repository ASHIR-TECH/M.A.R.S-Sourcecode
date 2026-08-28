import React, { useState } from 'react';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinished={() => setSplashDone(true)} />;
  }

  return <RootNavigator />;
}