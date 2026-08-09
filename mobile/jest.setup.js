require('react-native-reanimated').setUpTests();

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const official = require('react-native-safe-area-context/jest/mock');
  return {
    __esModule: true,
    ...official.default,
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children) };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('expo-device', () => ({
  __esModule: true,
  modelName: 'Pixel Test',
  deviceName: 'test-device',
}));
