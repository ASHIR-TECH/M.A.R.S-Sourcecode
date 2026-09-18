require('react-native-reanimated').setUpTests();

// Native modules that aren't present in the jest environment get stubbed so
// any screen importing them remains testable (e.g. SupportScreen's shows,
// SettingsScreen's tabs).
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
  return { WebView: MockWebView, default: MockWebView };
});

// In-memory expo-secure-store so stores that persist (pairing, desktop
// connection, install id) are testable without the native module.
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] ?? null)),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockVideoView = (props) => React.createElement(View, props);
  const useVideoPlayer = () => ({ play: jest.fn(), pause: jest.fn(), loop: false });
  return { VideoView: MockVideoView, useVideoPlayer, createVideoPlayer: jest.fn() };
});
