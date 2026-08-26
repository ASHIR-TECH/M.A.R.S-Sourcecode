import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SignInScreen } from '../screens/SignIn/SignInScreen';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Branches on auth status (Phase 2): unauthenticated users get the Sign In
 * screen; authenticated users land on the Home placeholder. Session
 * restore-on-launch bootstrap belongs to Phase 3+.
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return (
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    );
  }

  return <SignInScreen />;
}
