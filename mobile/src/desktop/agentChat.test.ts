import { getAgentMessage, sendAgentMessage } from './agentClient';
import { runAgentChat } from './agentChat';
import { DesktopConnection } from './types';

jest.mock('./agentClient');

const conn: DesktopConnection = { baseUrl: 'https://desk', token: 't' };

describe('runAgentChat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('polls until completed and returns text + tool calls', async () => {
    (sendAgentMessage as jest.Mock).mockResolvedValue('job-1');
    (getAgentMessage as jest.Mock)
      .mockResolvedValueOnce({ id: 'job-1', status: 'running', text: '', toolCalls: [] })
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'completed',
        text: 'Sent.',
        toolCalls: [{ name: 'send_file', status: 'completed' }],
      });

    const promise = runAgentChat(conn, 'send the file', 'sess');
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toMatchObject({
      text: 'Sent.',
      toolCalls: [{ name: 'send_file', status: 'completed' }],
    });
    expect(sendAgentMessage).toHaveBeenCalledWith(conn, 'send the file', 'sess');
    expect(getAgentMessage).toHaveBeenCalledTimes(2);
  });

  it('throws a server error when the job fails', async () => {
    (sendAgentMessage as jest.Mock).mockResolvedValue('job-2');
    (getAgentMessage as jest.Mock).mockResolvedValue({
      id: 'job-2',
      status: 'failed',
      text: 'Could not resolve peer',
      toolCalls: [],
    });

    await expect(runAgentChat(conn, 'x')).rejects.toMatchObject({
      kind: 'server',
      message: 'Could not resolve peer',
    });
  });
});
