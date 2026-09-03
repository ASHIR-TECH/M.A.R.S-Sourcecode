import { useChatSessionStore } from './useChatSessionStore';

describe('useChatSessionStore', () => {
  beforeEach(() => useChatSessionStore.setState({ messages: [], isAwaitingResponse: false }));

  it('adds a user message optimistically with sending status', () => {
    const msg = useChatSessionStore.getState().addUserMessage('hello', 's1');
    expect(msg.status).toBe('sending');
    expect(useChatSessionStore.getState().isAwaitingResponse).toBe(true);
  });

  it('marks a message sent', () => {
    const msg = useChatSessionStore.getState().addUserMessage('hi', 's1');
    useChatSessionStore.getState().markSent(msg.id);
    const updated = useChatSessionStore.getState().messages.find((m) => m.id === msg.id);
    expect(updated?.status).toBe('sent');
  });

  it('adds an AI message and clears awaiting flag', () => {
    useChatSessionStore.getState().addUserMessage('hi', 's1');
    useChatSessionStore.getState().addAiMessage('s1', 'Hello!', new Date().toISOString());
    expect(useChatSessionStore.getState().isAwaitingResponse).toBe(false);
  });
});