import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ChatScreen from '@/app/(tabs)/chat';
import { AuthProvider } from '@/contexts/AuthContext';
import { AgentProvider } from '@/contexts/AgentContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  },
  Redirect: () => null,
}));

jest.mock('@/api/agent', () => ({
  sendAgentMessage: jest.fn(),
  getAgentMessage: jest.fn(),
  getAgentStatus: jest.fn(),
}));

jest.mock('@/api/health', () => ({
  getHealth: jest.fn(),
  getReady: jest.fn(),
  checkReady: jest.fn(),
}));

import { getAgentMessage, getAgentStatus, sendAgentMessage } from '@/api/agent';
import { getHealth, getReady } from '@/api/health';

const mockSendAgentMessage = sendAgentMessage as jest.MockedFunction<
  typeof sendAgentMessage
>;
const mockGetAgentMessage = getAgentMessage as jest.MockedFunction<
  typeof getAgentMessage
>;

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AgentProvider>{children}</AgentProvider>
    </AuthProvider>
  );
}

describe('Chat flow (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getHealth as jest.Mock).mockResolvedValue({ status: 'ok' });
    (getReady as jest.Mock).mockResolvedValue({ status: 'ok' });
    (getAgentStatus as jest.Mock).mockResolvedValue({
      status: 'active',
      provider: 'ollama',
      model: 'llama3',
    });
  });

  it('sends a message, polls for the response and renders it in the conversation', async () => {
    mockSendAgentMessage.mockResolvedValue({ id: 'msg-1' });
    mockGetAgentMessage.mockResolvedValue({
      id: 'msg-1',
      status: 'completed',
      message: 'You received report.xlsx and budget.xlsx today.',
      tool_calls: [
        {
          tool_name: 'find_file',
          params: { pattern: '*.xlsx' },
          result_summary: '2 files',
          status: 'completed',
        },
      ],
    });

    const { getByPlaceholderText, getByLabelText, getByText } = render(
      <ChatScreen />,
      { wrapper: Providers }
    );

    fireEvent.changeText(
      getByPlaceholderText('Ask your agent…'),
      'What files did I receive today?'
    );
    fireEvent.press(getByLabelText('Send message'));

    await waitFor(() =>
      expect(mockSendAgentMessage).toHaveBeenCalledWith('What files did I receive today?')
    );

    await waitFor(() =>
      expect(getByText('You received report.xlsx and budget.xlsx today.')).toBeTruthy()
    );

    // The tool call step is rendered inline.
    expect(getByText('find_file')).toBeTruthy();
  });

  it('queues the message and shows a hint when the POST fails', async () => {
    mockSendAgentMessage.mockRejectedValue(new Error('offline'));

    const { getByPlaceholderText, getByLabelText, getByText } = render(
      <ChatScreen />,
      { wrapper: Providers }
    );

    fireEvent.changeText(getByPlaceholderText('Ask your agent…'), 'hello');
    fireEvent.press(getByLabelText('Send message'));

    await waitFor(() =>
      expect(
        getByText('Queued — will send when reconnected.')
      ).toBeTruthy()
    );
  });

  it('clears the input and disables send while a message is in flight', async () => {
    let resolvePost!: (v: { id: string }) => void;
    mockSendAgentMessage.mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolvePost = resolve;
        })
    );
    mockGetAgentMessage.mockResolvedValue({
      id: 'msg-2',
      status: 'completed',
      message: 'ok',
    });

    const { getByPlaceholderText, getByLabelText } = render(<ChatScreen />, {
      wrapper: Providers,
    });

    fireEvent.changeText(getByPlaceholderText('Ask your agent…'), 'ping');
    fireEvent.press(getByLabelText('Send message'));

    expect(getByPlaceholderText('Ask your agent…').props.value).toBe('');
    const sendButton = getByLabelText('Send message');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      resolvePost({ id: 'msg-2' });
    });
  });
});
