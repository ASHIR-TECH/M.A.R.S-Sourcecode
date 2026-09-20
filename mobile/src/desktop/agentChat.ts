import { ApiError } from './errors';
import { getAgentMessage, sendAgentMessage } from './agentClient';
import { AgentToolCall, DesktopConnection } from './types';

export interface AgentReply {
  text: string;
  toolCalls: AgentToolCall[];
  providerLabel?: string;
}

const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 60000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a natural-language instruction to the desktop's embedded agent and polls
 * until it finishes (PHASE_14 §"Sending a message": POST then poll every 1s).
 * The desktop does all the work — file transfers, peer lookup, shell — via its
 * own tool loop; the phone only relays text and renders the tool-call steps.
 */
export async function runAgentChat(
  conn: DesktopConnection,
  text: string,
  conversationId?: string
): Promise<AgentReply> {
  const id = await sendAgentMessage(conn, text, conversationId);
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const state = await getAgentMessage(conn, id);

    if (state.status === 'completed') {
      if (!state.text && state.toolCalls.length === 0) {
        throw new ApiError('server', 'The desktop returned an empty response.');
      }
      return { text: state.text, toolCalls: state.toolCalls, providerLabel: state.providerLabel };
    }

    if (state.status === 'failed') {
      throw new ApiError('server', state.text || 'The desktop agent could not complete that task.');
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new ApiError('timeout', 'The desktop agent is taking too long. Open the desktop app to check.');
}
