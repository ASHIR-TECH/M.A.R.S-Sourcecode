import { sendFallbackMessage } from './fallbackChatClient';
import { isAiLinkReady, sendAiMessage } from './aiClient';
import type { AppChatContext } from './appContext';

jest.mock('./deviceId', () => ({
  getInstallId: jest.fn().mockResolvedValue('test-device'),
}));

jest.mock('./aiClient', () => ({
  isAiLinkReady: jest.fn(),
  sendAiMessage: jest.fn(),
}));

const ready = isAiLinkReady as jest.Mock;
const send = sendAiMessage as jest.Mock;

describe('sendFallbackMessage — Supabase edge function link', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'https://relay.test';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
    jest.clearAllMocks();
  });

  it('routes to the edge function when the link is ready', async () => {
    ready.mockReturnValue(true);
    send.mockResolvedValue('Edge reply');

    await expect(sendFallbackMessage('hi')).resolves.toBe('Edge reply');
    expect(send).toHaveBeenCalledWith('hi', undefined);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('forwards context to the edge function', async () => {
    ready.mockReturnValue(true);
    send.mockResolvedValue('ok');

    const context: AppChatContext = {
      pairedDesktop: { id: 'DESK-1', name: 'Studio Rig' },
      devices: [],
    };
    await sendFallbackMessage('hi', context);

    expect(send).toHaveBeenCalledWith('hi', context);
  });

  it('lets a rate-limit message from the edge function surface verbatim', async () => {
    ready.mockReturnValue(true);
    send.mockRejectedValue(new Error("You've reached today's assistant limit."));

    await expect(sendFallbackMessage('hi')).rejects.toThrow(
      "You've reached today's assistant limit."
    );
  });

  it('falls back to the relay proxy when the link is not ready', async () => {
    ready.mockReturnValue(false);
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ reply: 'Relay reply' }),
    });

    await expect(sendFallbackMessage('hi')).resolves.toBe('Relay reply');
    expect(send).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      'https://relay.test/fallback-chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('still reports the app as unconfigured when neither path is available', async () => {
    ready.mockReturnValue(false);
    delete process.env.EXPO_PUBLIC_BACKEND_URL;

    await expect(sendFallbackMessage('hi')).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });
});
