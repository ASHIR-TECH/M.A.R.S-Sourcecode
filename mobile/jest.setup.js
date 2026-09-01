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

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockVideoView = (props) => React.createElement(View, props);
  const useVideoPlayer = () => ({ play: jest.fn(), pause: jest.fn(), loop: false });
  return { VideoView: MockVideoView, useVideoPlayer, createVideoPlayer: jest.fn() };
});
