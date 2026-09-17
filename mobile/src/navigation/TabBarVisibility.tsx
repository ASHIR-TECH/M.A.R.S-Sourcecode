import React, { createContext, useContext } from 'react';

type SetTabBarHidden = (hidden: boolean) => void;

const noop: SetTabBarHidden = () => {};

const TabBarVisibilityContext = createContext<SetTabBarHidden>(noop);

interface TabBarVisibilityProviderProps {
  setHidden: SetTabBarHidden;
  children: React.ReactNode;
}

/**
 * Lets any tab page (including full-screen overlays rendered inside a page,
 * e.g. Privacy & Security) ask the global bottom bar to hide while the user is
 * reading, and show again once they reach the end of the content.
 */
export function TabBarVisibilityProvider({ setHidden, children }: TabBarVisibilityProviderProps) {
  return (
    <TabBarVisibilityContext.Provider value={setHidden}>{children}</TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility(): SetTabBarHidden {
  return useContext(TabBarVisibilityContext);
}
