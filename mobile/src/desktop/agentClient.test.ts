import { checkReady, getAgentMessage, sendAgentMessage } from './agentClient';
import { DesktopConnection } from './types';

const conn: DesktopConnection = { baseUrl: 'https://desk.test/', token: 'tok' };

describe('agentClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  it('POSTs the message with bearer auth and a trimmed base URL', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 201, ok: true, json: async () => ({ id: 'job-1' }) });

    await expect(sendAgentMessage(conn, 'send file', 'sess-1')).resolves.toBe('job-1');

    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://desk.test/api/v1/agent/message');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ message: 'send file', conversation_id: 'sess-1' });
  });

  it('maps a 401 to an auth ApiError', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });

    await expect(checkReady(conn)).rejects.toMatchObject({ kind: 'auth', status: 401 });
  });

  it('maps a fetch rejection to a network ApiError', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(checkReady(conn)).rejects.toMatchObject({ kind: 'network' });
  });

  it('rejects when the desktop returns no message id', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 200, ok: true, json: async () => ({}) });

    await expect(sendAgentMessage(conn, 'hi')).rejects.toMatchObject({ kind: 'server' });
  });

  it('normalizes snake_case tool calls and provider', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: 'job-1',
        status: 'completed',
        message: 'Done',
        provider: 'Ollama',
        tool_calls: [
          { id: 't1', name: 'send_file', status: 'completed', params: { peer_id: 'X' }, result: 'ok' },
        ],
      }),
    });

    const state = await getAgentMessage(conn, 'job-1');
    expect(state.text).toBe('Done');
    expect(state.providerLabel).toBe('Ollama');
    expect(state.toolCalls).toEqual([
      { id: 't1', name: 'send_file', status: 'completed', params: { peer_id: 'X' }, result: 'ok' },
    ]);
  });

  it('accepts camelCase toolCalls and uses the response field', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        id: 'j',
        status: 'completed',
        response: 'hi',
        toolCalls: [{ tool: 'list_peers', status: 'completed' }],
      }),
    });

    const state = await getAgentMessage(conn, 'j');
    expect(state.text).toBe('hi');
    expect(state.toolCalls[0]).toMatchObject({ name: 'list_peers', status: 'completed' });
  });
});
