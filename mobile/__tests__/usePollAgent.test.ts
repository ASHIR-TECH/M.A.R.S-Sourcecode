import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePollAgent } from '@/hooks/usePollAgent';
import type { AgentMessage } from '@/api/types';

jest.mock('@/api/agent', () => ({
  getAgentMessage: jest.fn(),
}));

import { getAgentMessage } from '@/api/agent';
const mockGetAgentMessage = getAgentMessage as jest.MockedFunction<
  typeof getAgentMessage
>;

describe('usePollAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves on the first poll that returns a completed message, then stops polling', async () => {
    mockGetAgentMessage.mockResolvedValue({
      id: 'm1',
      status: 'completed',
      message: 'Done.',
    });

    const { result } = renderHook(() => usePollAgent('m1', 1000));
    expect(result.current.status).toBe('polling');

    await waitFor(() => expect(result.current.status).toBe('resolved'));
    expect(result.current.message?.message).toBe('Done.');
    expect(mockGetAgentMessage).toHaveBeenCalledTimes(1);

    // Polling must not continue after resolution.
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetAgentMessage).toHaveBeenCalledTimes(1);
  });

  it('returns to idle when messageId is cleared', async () => {
    mockGetAgentMessage.mockResolvedValue({ id: 'm1', status: 'pending' });

    const { result, rerender } = renderHook(
      (props: { id: string | null }) => usePollAgent(props.id),
      { initialProps: { id: 'm1' as string | null } }
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.status).toBe('polling');

    rerender({ id: null });
    expect(result.current.status).toBe('idle');
    expect(result.current.message).toBeNull();
  });

  it('reports failure when the message ends in the failed state', async () => {
    mockGetAgentMessage.mockResolvedValue({
      id: 'm1',
      status: 'failed',
      error: 'provider unreachable',
    } as AgentMessage);

    const { result } = renderHook(() => usePollAgent('m1', 1000));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('provider unreachable');
  });

  it('reports an error when a poll request fails', async () => {
    mockGetAgentMessage.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePollAgent('m1', 1000));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('boom');
  });

  it('stops cleanly on unmount mid-poll — no setState on unmounted component', async () => {
    let resolveFn!: (v: AgentMessage) => void;
    mockGetAgentMessage.mockImplementation(
      () =>
        new Promise<AgentMessage>((resolve) => {
          resolveFn = resolve;
        })
    );

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => usePollAgent('m1', 1000));
    unmount();

    await act(async () => {
      resolveFn({ id: 'm1', status: 'completed', message: 'late' });
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();

    // No polling continues after unmount.
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockGetAgentMessage).toHaveBeenCalledTimes(1);
  });
});
