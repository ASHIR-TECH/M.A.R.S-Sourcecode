import { sendFallbackMessage } from './fallbackChatClient';

jest.mock('./deviceId', () => ({
  getInstallId: jest.fn().mockResolvedValue('test-device'),
}));

describe('sendFallbackMessage', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'https://relay.test';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
    jest.clearAllMocks();
  });

  it('returns the reply text and posts to the backend proxy', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ reply: 'Hello there', providerLabel: 'Groq' }),
    });

    await expect(sendFallbackMessage('hi')).resolves.toBe('Hello there');
    expect(fetch).toHaveBeenCalledWith(
      'https://relay.test/fallback-chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('forwards app-level context when provided', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ reply: 'ok' }),
    });

    const context = { pairedDesktop: { id: 'DESK-1', name: 'Studio Rig' }, devices: [] };
    await sendFallbackMessage('hi', context);

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.context).toEqual(context);
  });

  it('omits context when none is supplied', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ reply: 'ok' }),
    });

    await sendFallbackMessage('hi');

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).not.toHaveProperty('context');
  });

  it('surfaces the server message when the daily limit is reached', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 429,
      ok: false,
      json: async () => ({ message: 'Daily limit reached.' }),
    });

    await expect(sendFallbackMessage('hi')).rejects.toThrow('Daily limit reached.');
  });

  it('throws a friendly error when the request fails', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 500, ok: false, json: async () => ({}) });

    await expect(sendFallbackMessage('hi')).rejects.toThrow('Could not reach the assistant');
  });

  it('throws when the backend is not configured', async () => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;

    await expect(sendFallbackMessage('hi')).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });
});
