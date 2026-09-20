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

  it('stores a provider label passed to addAiMessage', () => {
    const ai = useChatSessionStore
      .getState()
      .addAiMessage('s1', 'Hello!', new Date().toISOString(), { providerLabel: 'Claude' });
    expect(ai.providerLabel).toBe('Claude');
    const stored = useChatSessionStore.getState().messages.find((m) => m.id === ai.id);
    expect(stored?.providerLabel).toBe('Claude');
  });

  it('sets a provider label by message id', () => {
    const ai = useChatSessionStore.getState().addAiMessage('s1', 'Hello!', new Date().toISOString());
    useChatSessionStore.getState().setProviderLabel(ai.id, 'Ollama (local)');
    const stored = useChatSessionStore.getState().messages.find((m) => m.id === ai.id);
    expect(stored?.providerLabel).toBe('Ollama (local)');
  });

  it('marks the newest message of a session as fallback', () => {
    useChatSessionStore.getState().addUserMessage('hi', 's1');
    const ai = useChatSessionStore.getState().addAiMessage('s1', 'reply', new Date().toISOString());
    useChatSessionStore.getState().markLastMessageAsFallback('s1');
    const stored = useChatSessionStore.getState().messages.find((m) => m.id === ai.id);
    expect(stored?.viaFallback).toBe(true);
  });

  it('marks fallback only for the target session', () => {
    const a = useChatSessionStore.getState().addAiMessage('s1', 'a', new Date().toISOString());
    const b = useChatSessionStore.getState().addAiMessage('s2', 'b', new Date().toISOString());
    useChatSessionStore.getState().markLastMessageAsFallback('s1');
    const messages = useChatSessionStore.getState().messages;
    expect(messages.find((m) => m.id === a.id)?.viaFallback).toBe(true);
    expect(messages.find((m) => m.id === b.id)?.viaFallback).toBeUndefined();
  });
});