import { ComponentType } from 'react';
import { HomeTabIcon } from '../components/icons/HomeTabIcon';
import { DevicesTabIcon } from '../components/icons/DevicesTabIcon';
import { ChatTabIcon } from '../components/icons/ChatTabIcon';
import { SettingsTabIcon } from '../components/icons/SettingsTabIcon';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { DevicesScreen } from '../screens/Devices/DevicesScreen';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';

export interface TabConfig {
  name: 'Home' | 'Devices' | 'Chat' | 'Settings';
  label: string;
  icon: ComponentType<{ color: string; focused: boolean }>;
  component: ComponentType<any>;
}

/**
 * Tab metadata as data (Phase 4, §5.1): reordering tabs or adding a badge
 * later is a data change here, never a structural edit in the navigator.
 */
export const TAB_CONFIG: TabConfig[] = [
  { name: 'Home', label: 'Home', icon: HomeTabIcon, component: HomeScreen },
  { name: 'Chat', label: 'Chat', icon: ChatTabIcon, component: ChatScreen },
  { name: 'Devices', label: 'Devices', icon: DevicesTabIcon, component: DevicesScreen },
  { name: 'Settings', label: 'Settings', icon: SettingsTabIcon, component: SettingsScreen },
];